/**
 * Availability Service
 * Service-first availability calculation engine
 * Generates dynamic time slots based on service duration, buffers, and constraints
 */

const db = require('../models');
const { Op } = require('sequelize');

const logTimings = process.env.AVAILABILITY_TIMING_LOG === '1' || process.env.NODE_ENV !== 'production';

function now() { return Date.now(); }

class AvailabilityService {
    /**
     * Get available slots for a service
     * Service-first approach: slots are generated based on service duration + buffers
     *
     * @param {string} tenantId - Tenant ID
     * @param {string} serviceId - Service ID (required)
     * @param {string} staffId - Staff ID (optional, null = any staff)
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Object>} Available slots with metadata
     */
    async getAvailableSlots(tenantId, { serviceId, staffId, date }) {
        const t0 = now();
        const timings = { fetchService: 0, fetchSettings: 0, fetchStaff: 0, fetchShifts: 0, fetchAppointments: 0, computeSlots: 0 };

        if (!serviceId || !date) {
            throw new Error('serviceId and date are required');
        }

        let t = now();
        const service = await db.Service.findByPk(serviceId);
        if (logTimings) timings.fetchService = now() - t;
        if (!service) throw new Error('Service not found');
        if (service.tenantId !== tenantId) {
            throw new Error('Service does not belong to this tenant');
        }

        t = now();
        const tenantSettings = await this._getTenantSettings(tenantId);
        if (logTimings) timings.fetchSettings = now() - t;
        const stepSize = tenantSettings.booking?.slotInterval || 15;
        const timezone = tenantSettings.timezone || 'Asia/Riyadh';

        const duration = service.duration || 30;
        const bufferBefore = service.bufferBefore || tenantSettings.booking?.defaultBufferBefore || 0;
        const bufferAfter = service.bufferAfter || tenantSettings.booking?.defaultBufferAfter || 0;
        const totalSlotLength = duration + bufferBefore + bufferAfter;

        let result;
        if (staffId) {
            result = await this._getSlotsForStaff(
                tenantId,
                serviceId,
                staffId,
                date,
                duration,
                bufferBefore,
                bufferAfter,
                totalSlotLength,
                stepSize,
                timezone,
                timings
            );
        } else {
            result = await this._getSlotsForAnyStaffBatched(
                tenantId,
                serviceId,
                date,
                duration,
                bufferBefore,
                bufferAfter,
                totalSlotLength,
                stepSize,
                timezone,
                timings
            );
        }

        if (logTimings) {
            result._timings = { ...timings, totalMs: now() - t0 };
        }
        return result;
    }

    /**
     * Get available slots for a specific staff member
     * @private
     */
    async _getSlotsForStaff(tenantId, serviceId, staffId, date, duration, bufferBefore, bufferAfter, totalSlotLength, stepSize, timezone = 'Asia/Riyadh', timings = {}) {
        let t = now();
        const staff = await db.Staff.findByPk(staffId);
        if (logTimings) timings.fetchStaff = (timings.fetchStaff || 0) + (now() - t);
        if (!staff) throw new Error('Staff not found');
        if (staff.tenantId !== tenantId) throw new Error('Staff does not belong to this tenant');
        if (!staff.isActive) throw new Error('Staff is not active');

        const canPerform = await db.ServiceEmployee.findOne({ where: { serviceId, staffId } });
        if (!canPerform) throw new Error('Staff cannot perform this service');

        t = now();
        const availabilityWindow = await this._calculateAvailabilityWindow(tenantId, staffId, date);
        if (logTimings) timings.fetchShifts = (timings.fetchShifts || 0) + (now() - t);

        if (!availabilityWindow || availabilityWindow.length === 0) {
            return {
                slots: [],
                metadata: {
                    date, serviceId, staffId, serviceDuration: duration, bufferBefore, bufferAfter,
                    totalSlotLength, stepSize, timezone, totalSlots: 0, availableSlots: 0, staffCount: 1
                }
            };
        }

        t = now();
        const existingAppointments = await this._getExistingAppointments(staffId, date);
        if (logTimings) timings.fetchAppointments = (timings.fetchAppointments || 0) + (now() - t);

        t = now();
        const allSlots = [];
        for (const window of availabilityWindow) {
            const slots = this._generateSlots(
                window.startTime, window.endTime, duration, bufferBefore, bufferAfter,
                totalSlotLength, stepSize, existingAppointments
            );
            allSlots.push(...slots);
        }
        allSlots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        if (logTimings) timings.computeSlots = (timings.computeSlots || 0) + (now() - t);

        return {
            slots: allSlots,
            metadata: {
                date, serviceId, staffId, staffName: staff.name, serviceDuration: duration,
                bufferBefore, bufferAfter, totalSlotLength, stepSize, timezone,
                totalSlots: allSlots.length, availableSlots: allSlots.filter(s => s.available).length, staffCount: 1
            }
        };
    }

    /**
     * Get available slots for any eligible staff (batched: constant query count).
     * Fetches staff, shifts, breaks, time-off, overrides, appointments in bulk then computes in memory.
     * @private
     */
    async _getSlotsForAnyStaffBatched(tenantId, serviceId, date, duration, bufferBefore, bufferAfter, totalSlotLength, stepSize, timezone, timings) {
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay();
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        let t = now();
        const serviceEmployees = await db.ServiceEmployee.findAll({ where: { serviceId } });
        const staffIds = [...new Set(serviceEmployees.map(se => se.staffId))];
        if (staffIds.length === 0) {
            return {
                slots: [],
                metadata: {
                    date, serviceId, staffId: null, serviceDuration: duration, bufferBefore, bufferAfter,
                    totalSlotLength, stepSize, timezone, totalSlots: 0, availableSlots: 0, staffCount: 0
                }
            };
        }
        const [staffMembers, tenant] = await Promise.all([
            db.Staff.findAll({
                where: { id: { [Op.in]: staffIds }, tenantId, isActive: true },
                attributes: ['id', 'name']
            }),
            db.Tenant.findByPk(tenantId)
        ]);
        const staffIdsFiltered = staffMembers.map(s => s.id);
        if (logTimings) timings.fetchStaff = now() - t;

        // Batched queries for availability (indexes documented in AVAILABILITY_OPTIMIZATION.md):
        // 1) staff_shifts date:   WHERE staff_id IN (?), specific_date = ?, is_active = true, is_recurring = false
        // 2) staff_shifts recur:  WHERE staff_id IN (?), day_of_week = ?, is_recurring = true, is_active = true, start_date, end_date range
        // 3) staff_schedules:     WHERE staffId IN (?), dayOfWeek = ?, isAvailable = true
        // 4) staff_breaks date:   WHERE staff_id IN (?), specific_date = ?, is_active = true, is_recurring = false
        // 5) staff_breaks recur:  WHERE staff_id IN (?), day_of_week = ?, is_recurring = true, is_active = true, start_date, end_date range
        // 6) staff_time_off:      WHERE staff_id IN (?), is_approved = true, start_date <= ?, end_date >= ?
        // 7) staff_schedule_overrides: WHERE staff_id IN (?), date = ?
        // 8) appointments:       WHERE tenantId = ?, staffId IN (?), startTime BETWEEN ?, status NOT IN ('cancelled','no_show')
        t = now();
        const [
            dateSpecificShiftsAll,
            recurringShiftsAll,
            legacySchedulesAll,
            dateBreaksAll,
            recurringBreaksAll,
            timeOffAll,
            overridesAll,
            appointmentsAll
        ] = await Promise.all([
            db.StaffShift.findAll({
                where: {
                    staffId: { [Op.in]: staffIdsFiltered },
                    specificDate: date,
                    isActive: true,
                    isRecurring: false
                }
            }),
            db.StaffShift.findAll({
                where: {
                    staffId: { [Op.in]: staffIdsFiltered },
                    dayOfWeek,
                    isRecurring: true,
                    isActive: true,
                    [Op.and]: [
                        { [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: date } }] },
                        { [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: date } }] }
                    ]
                }
            }),
            db.StaffSchedule.findAll({
                where: { staffId: { [Op.in]: staffIdsFiltered }, dayOfWeek, isAvailable: true }
            }),
            db.StaffBreak.findAll({
                where: {
                    staffId: { [Op.in]: staffIdsFiltered },
                    specificDate: date,
                    isActive: true,
                    isRecurring: false
                }
            }),
            db.StaffBreak.findAll({
                where: {
                    staffId: { [Op.in]: staffIdsFiltered },
                    dayOfWeek,
                    isRecurring: true,
                    isActive: true,
                    [Op.and]: [
                        { [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: date } }] },
                        { [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: date } }] }
                    ]
                }
            }),
            db.StaffTimeOff.findAll({
                where: {
                    staffId: { [Op.in]: staffIdsFiltered },
                    isApproved: true,
                    startDate: { [Op.lte]: date },
                    endDate: { [Op.gte]: date }
                }
            }),
            db.StaffScheduleOverride.findAll({
                where: { staffId: { [Op.in]: staffIdsFiltered }, date }
            }),
            db.Appointment.findAll({
                where: {
                    tenantId,
                    staffId: { [Op.in]: staffIdsFiltered },
                    startTime: { [Op.between]: [startOfDay, endOfDay] },
                    status: { [Op.notIn]: ['cancelled', 'no_show'] }
                },
                order: [['startTime', 'ASC']],
                raw: true
            })
        ]);
        if (logTimings) {
            timings.fetchShifts = now() - t;
            timings.fetchAppointments = 0;
        }

        const shiftsByStaff = new Map();
        for (const s of dateSpecificShiftsAll) shiftsByStaff.set(s.staffId, [...(shiftsByStaff.get(s.staffId) || []), s]);
        for (const s of recurringShiftsAll) shiftsByStaff.set(s.staffId, [...(shiftsByStaff.get(s.staffId) || []), s]);
        const legacyByStaff = new Map();
        for (const s of legacySchedulesAll) legacyByStaff.set(s.staffId, s);
        const breaksByStaff = new Map();
        for (const b of dateBreaksAll) breaksByStaff.set(b.staffId, [...(breaksByStaff.get(b.staffId) || []), b]);
        for (const b of recurringBreaksAll) breaksByStaff.set(b.staffId, [...(breaksByStaff.get(b.staffId) || []), b]);
        const timeOffByStaff = new Map();
        for (const t of timeOffAll) timeOffByStaff.set(t.staffId, [...(timeOffByStaff.get(t.staffId) || []), t]);
        const overridesByStaff = new Map();
        for (const o of overridesAll) overridesByStaff.set(o.staffId, [...(overridesByStaff.get(o.staffId) || []), o]);
        const appointmentsByStaff = new Map();
        for (const a of appointmentsAll) appointmentsByStaff.set(a.staffId, [...(appointmentsByStaff.get(a.staffId) || []), a]);

        const tenantHours = tenant ? this._parseBusinessHours(tenant.workingHours, dayOfWeek) : null;

        t = now();
        const slotsByStaff = [];
        for (const staff of staffMembers) {
            const sid = staff.id;
            const shifts = shiftsByStaff.get(sid) || [];
            const legacy = legacyByStaff.get(sid);
            const breaks = (breaksByStaff.get(sid) || []).map(b => ({
                startTime: this._combineDateAndTime(date, b.startTime),
                endTime: this._combineDateAndTime(date, b.endTime)
            }));
            const timeOff = (timeOffByStaff.get(sid) || []).map(record => ({
                startTime: new Date(record.startDate),
                endTime: new Date(new Date(record.endDate).getTime() + 24 * 60 * 60 * 1000)
            }));
            const overridesList = overridesByStaff.get(sid) || [];
            let availableWindow;
            try {
                availableWindow = this._buildAvailabilityWindowFromData(
                    date, tenantHours, shifts, legacy, breaks, timeOff, overridesList
                );
            } catch (err) {
                if (process.env.NODE_ENV !== 'test' && process.env.AVAILABILITY_DEBUG_LOG === '1') {
                    console.info(`Skipping staff ${sid}:`, err.message);
                }
                continue;
            }
            if (!availableWindow || availableWindow.length === 0) continue;
            const existingAppointments = appointmentsByStaff.get(sid) || [];
            for (const window of availableWindow) {
                const slots = this._generateSlots(
                    window.startTime, window.endTime, duration, bufferBefore, bufferAfter,
                    totalSlotLength, stepSize, existingAppointments
                );
                slots.forEach(slot => {
                    slot.staffId = staff.id;
                    slot.staffName = staff.name;
                });
                slotsByStaff.push(...slots);
            }
        }
        slotsByStaff.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        const uniqueSlots = [];
        const seenTimes = new Set();
        for (const slot of slotsByStaff) {
            const timeKey = new Date(slot.startTime).toISOString();
            if (!seenTimes.has(timeKey)) {
                seenTimes.add(timeKey);
                uniqueSlots.push(slot);
            }
        }
        if (logTimings) timings.computeSlots = now() - t;

        return {
            slots: uniqueSlots,
            metadata: {
                date, serviceId, staffId: null, serviceDuration: duration, bufferBefore, bufferAfter,
                totalSlotLength, stepSize, timezone,
                totalSlots: uniqueSlots.length,
                availableSlots: uniqueSlots.filter(s => s.available).length,
                staffCount: staffMembers.length
            }
        };
    }

    /**
     * Build availability windows for one staff from pre-fetched data (sync, no DB).
     * @private
     */
    _buildAvailabilityWindowFromData(date, tenantHours, shifts, legacySchedule, breaks, timeOff, overrides) {
        let availableWindow = [];
        if (shifts.length > 0) {
            availableWindow = shifts.map(shift => ({
                startTime: this._combineDateAndTime(date, shift.startTime),
                endTime: this._combineDateAndTime(date, shift.endTime)
            }));
        } else if (legacySchedule) {
            availableWindow = [{
                startTime: this._combineDateAndTime(date, legacySchedule.startTime),
                endTime: this._combineDateAndTime(date, legacySchedule.endTime)
            }];
        } else {
            return [];
        }
        if (tenantHours) {
            const tenantStart = this._combineDateAndTime(date, tenantHours.start);
            const tenantEnd = this._combineDateAndTime(date, tenantHours.end);
            availableWindow = this._intersectWindows(availableWindow, [{ startTime: tenantStart, endTime: tenantEnd }]);
        }
        availableWindow = this._subtractWindows(availableWindow, breaks);
        availableWindow = this._subtractWindows(availableWindow, timeOff);
        availableWindow = this._applyOverrides(availableWindow, overrides);
        return availableWindow;
    }

    /**
     * Calculate availability window for a staff member on a specific date
     * Considers: tenant business hours, staff schedule, breaks, time-off, overrides
     * @private
     */
    async _calculateAvailabilityWindow(tenantId, staffId, date) {
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                throw new Error(`Invalid date format: ${date}`);
            }
            const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

            // Layer A: Get tenant business hours
            const tenant = await db.Tenant.findByPk(tenantId);
            if (!tenant) {
                throw new Error(`Tenant not found: ${tenantId}`);
            }
            const tenantHours = this._parseBusinessHours(tenant.workingHours, dayOfWeek);

            // Layer B: Get staff shifts (new model - supports multiple shifts per day)
            // First check for date-specific shifts
            const dateSpecificShifts = await db.StaffShift.findAll({
                where: {
                    staffId,
                    specificDate: date,
                    isActive: true,
                    isRecurring: false
                }
            });

            // Then check for recurring shifts for this day of week
            const recurringShifts = await db.StaffShift.findAll({
                where: {
                    staffId,
                    dayOfWeek,
                    isRecurring: true,
                    isActive: true,
                    [Op.and]: [
                        {
                            [Op.or]: [
                                { startDate: null },
                                { startDate: { [Op.lte]: date } }
                            ]
                        },
                        {
                            [Op.or]: [
                                { endDate: null },
                                { endDate: { [Op.gte]: date } }
                            ]
                        }
                    ]
                }
            });

            // Combine all shifts
            const allShifts = [...dateSpecificShifts, ...recurringShifts];

            // Declare availableWindow variable
            let availableWindow = [];

            // If no shifts, fall back to legacy StaffSchedule
            if (allShifts.length === 0) {
                const legacySchedule = await db.StaffSchedule.findOne({
                    where: {
                        staffId,
                        dayOfWeek,
                        isAvailable: true
                    }
                });

                if (!legacySchedule) {
                    return []; // No schedule for this day
                }

                const scheduleStart = this._combineDateAndTime(date, legacySchedule.startTime);
                const scheduleEnd = this._combineDateAndTime(date, legacySchedule.endTime);

                availableWindow = [{
                    startTime: scheduleStart,
                    endTime: scheduleEnd
                }];
            } else {
                // Convert shifts to time windows
                availableWindow = allShifts.map(shift => ({
                    startTime: this._combineDateAndTime(date, shift.startTime),
                    endTime: this._combineDateAndTime(date, shift.endTime)
                }));
            }

            // Apply tenant business hours (intersect)
            if (tenantHours) {
                const tenantStart = this._combineDateAndTime(date, tenantHours.start);
                const tenantEnd = this._combineDateAndTime(date, tenantHours.end);
                
                availableWindow = this._intersectWindows(availableWindow, [{
                    startTime: tenantStart,
                    endTime: tenantEnd
                }]);
            }

            // Layer C - Subtract breaks
            const breaks = await this._getStaffBreaks(staffId, date);
            availableWindow = this._subtractWindows(availableWindow, breaks);

            // Layer D - Subtract time-off
            const timeOff = await this._getStaffTimeOff(staffId, date);
            availableWindow = this._subtractWindows(availableWindow, timeOff);

            // Apply schedule overrides
            const overrides = await this._getStaffOverrides(staffId, date);
            availableWindow = this._applyOverrides(availableWindow, overrides);

            return availableWindow;
        } catch (error) {
            if (process.env.NODE_ENV !== 'test') {
                console.error('Error in _calculateAvailabilityWindow:', {
                    tenantId,
                    staffId,
                    date,
                    error: error.message,
                    stack: error.stack
                });
            }
            throw error;
        }
    }

    /**
     * Generate time slots within a time window
     * @private
     */
    _generateSlots(windowStart, windowEnd, duration, bufferBefore, bufferAfter, totalSlotLength, stepSize, existingAppointments) {
        const slots = [];
        let current = new Date(windowStart);

        while (current < windowEnd) {
            const slotStart = new Date(current);
            const slotEnd = new Date(current.getTime() + totalSlotLength * 60000);

            // Check if slot fits in window
            if (slotEnd > windowEnd) {
                break; // No more slots fit
            }

            // Check for conflicts with existing appointments
            const hasConflict = this._hasConflict(
                slotStart,
                slotEnd,
                duration,
                bufferBefore,
                bufferAfter,
                existingAppointments
            );

            slots.push({
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                available: !hasConflict,
                staffId: null, // Will be set by caller if needed
                staffName: null
            });

            // Move to next slot (by step size)
            current = new Date(current.getTime() + stepSize * 60000);
        }

        return slots;
    }

    /**
     * Check if a time slot conflicts with existing appointments
     * Enhanced conflict detection with buffer support
     * @private
     */
    _hasConflict(slotStart, slotEnd, duration, bufferBefore, bufferAfter, existingAppointments) {
        return existingAppointments.some(appt => {
            const apptStart = new Date(appt.startTime);
            const apptEnd = new Date(appt.endTime);

            // Apply buffers to appointment
            const apptStartWithBuffer = new Date(apptStart.getTime() - bufferBefore * 60000);
            const apptEndWithBuffer = new Date(apptEnd.getTime() + bufferAfter * 60000);

            // Check all overlap cases
            return (
                // Slot starts during appointment (with buffer)
                (slotStart >= apptStartWithBuffer && slotStart < apptEndWithBuffer) ||
                // Slot ends during appointment (with buffer)
                (slotEnd > apptStartWithBuffer && slotEnd <= apptEndWithBuffer) ||
                // Slot completely contains appointment
                (slotStart <= apptStartWithBuffer && slotEnd >= apptEndWithBuffer) ||
                // Appointment completely contains slot
                (apptStartWithBuffer <= slotStart && apptEndWithBuffer >= slotEnd)
            );
        });
    }

    /**
     * Get existing appointments for a staff member on a date
     * @private
     */
    async _getExistingAppointments(staffId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return await db.Appointment.findAll({
            where: {
                staffId,
                startTime: { [Op.between]: [startOfDay, endOfDay] },
                status: { [Op.notIn]: ['cancelled', 'no_show'] }
            },
            order: [['startTime', 'ASC']]
        });
    }

    /**
     * Get tenant settings (with defaults)
     * @private
     */
    async _getTenantSettings(tenantId) {
        try {
            const tenantSettings = await db.TenantSettings.findOne({
                where: { tenantId }
            });

            if (tenantSettings && tenantSettings.bookingSettings) {
                return {
                    booking: {
                        slotInterval: tenantSettings.bookingSettings.slotInterval || 15,
                        defaultBufferBefore: tenantSettings.bookingSettings.defaultBufferBefore || 5,
                        defaultBufferAfter: tenantSettings.bookingSettings.defaultBufferAfter || 5,
                        allowAnyStaff: tenantSettings.bookingSettings.allowAnyStaff !== false, // Default true
                        maxBookingsPerCustomerPerDay: tenantSettings.bookingSettings.maxBookingsPerCustomerPerDay || null
                    }
                };
            }
        } catch (error) {
            if (process.env.NODE_ENV !== 'test' && process.env.AVAILABILITY_DEBUG_LOG === '1') {
                console.info('Failed to load tenant settings, using defaults:', error.message);
            }
        }

        // Return defaults if no settings found
        return {
            booking: {
                slotInterval: 15, // minutes
                defaultBufferBefore: 5,
                defaultBufferAfter: 5,
                allowAnyStaff: true,
                maxBookingsPerCustomerPerDay: null
            }
        };
    }

    /**
     * Parse business hours for a specific day of week
     * @private
     */
    _parseBusinessHours(workingHours, dayOfWeek) {
        if (!workingHours || typeof workingHours !== 'object') {
            return null;
        }

        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];

        const dayHours = workingHours[dayName];
        if (!dayHours || !dayHours.isOpen) {
            return null;
        }

        return {
            start: dayHours.open || '09:00',
            end: dayHours.close || '18:00'
        };
    }

    /**
     * Combine date and time string into Date object
     * @private
     */
    _combineDateAndTime(date, time) {
        try {
            // Handle date
            let dateStr;
            if (date instanceof Date) {
                dateStr = date.toISOString().split('T')[0];
            } else if (typeof date === 'string') {
                dateStr = date.split('T')[0]; // Extract date part if ISO string
            } else {
                throw new Error(`Invalid date format: ${date}`);
            }

            // Handle time - could be string, Date object, or null
            let timeStr;
            if (!time) {
                throw new Error(`Time is required but got: ${time}`);
            } else if (time instanceof Date) {
                // If time is a Date object, extract time part
                timeStr = time.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
            } else if (typeof time === 'string') {
                // Handle various time formats: "09:00:00", "09:00", "09:00:00.000000"
                timeStr = time.split('.')[0]; // Remove microseconds if present
                if (!timeStr.includes(':')) {
                    throw new Error(`Invalid time format: ${time}`);
                }
                // Ensure we have at least HH:MM
                const parts = timeStr.split(':');
                if (parts.length >= 2) {
                    timeStr = `${parts[0]}:${parts[1]}`; // Just HH:MM
                } else {
                    throw new Error(`Invalid time format: ${time}`);
                }
            } else {
                throw new Error(`Invalid time type: ${typeof time}, value: ${time}`);
            }

            // Combine and create Date object
            const combined = `${dateStr}T${timeStr}:00`; // Add seconds
            const result = new Date(combined);
            
            if (isNaN(result.getTime())) {
                throw new Error(`Invalid date/time combination: ${combined}`);
            }
            
            return result;
        } catch (error) {
            if (process.env.NODE_ENV !== 'test') {
                console.error('Error in _combineDateAndTime:', { date, time, error: error.message });
            }
            throw new Error(`Failed to combine date and time: ${error.message}`);
        }
    }

    /**
     * Intersect two sets of time windows
     * @private
     */
    _intersectWindows(windows1, windows2) {
        const result = [];
        for (const w1 of windows1) {
            for (const w2 of windows2) {
                const start = w1.startTime > w2.startTime ? w1.startTime : w2.startTime;
                const end = w1.endTime < w2.endTime ? w1.endTime : w2.endTime;
                if (start < end) {
                    result.push({ startTime: start, endTime: end });
                }
            }
        }
        return result;
    }

    /**
     * Get staff breaks for a specific date
     * @private
     */
    async _getStaffBreaks(staffId, date) {
        const dayOfWeek = new Date(date).getDay();
        
        // Get date-specific breaks
        const dateBreaks = await db.StaffBreak.findAll({
            where: {
                staffId,
                specificDate: date,
                isActive: true,
                isRecurring: false
            }
        });

        // Get recurring breaks for this day
        const recurringBreaks = await db.StaffBreak.findAll({
            where: {
                staffId,
                dayOfWeek,
                isRecurring: true,
                isActive: true,
                [Op.and]: [
                    {
                        [Op.or]: [
                            { startDate: null },
                            { startDate: { [Op.lte]: date } }
                        ]
                    },
                    {
                        [Op.or]: [
                            { endDate: null },
                            { endDate: { [Op.gte]: date } }
                        ]
                    }
                ]
            }
        });

        // Combine and convert to time windows
        const allBreaks = [...dateBreaks, ...recurringBreaks];
        return allBreaks.map(breakRecord => ({
            startTime: this._combineDateAndTime(date, breakRecord.startTime),
            endTime: this._combineDateAndTime(date, breakRecord.endTime)
        }));
    }

    /**
     * Get staff time-off for a specific date
     * @private
     */
    async _getStaffTimeOff(staffId, date) {
        const timeOffRecords = await db.StaffTimeOff.findAll({
            where: {
                staffId,
                isApproved: true,
                startDate: { [Op.lte]: date },
                endDate: { [Op.gte]: date }
            }
        });

        // Convert to full-day time windows
        return timeOffRecords.map(record => ({
            startTime: new Date(record.startDate),
            endTime: new Date(new Date(record.endDate).getTime() + 24 * 60 * 60 * 1000) // End of end date
        }));
    }

    /**
     * Get staff schedule overrides for a specific date
     * @private
     */
    async _getStaffOverrides(staffId, date) {
        return await db.StaffScheduleOverride.findAll({
            where: {
                staffId,
                date
            }
        });
    }

    /**
     * Subtract time windows (remove breaks/time-off from availability)
     * @private
     */
    _subtractWindows(availableWindows, subtractWindows) {
        if (subtractWindows.length === 0) return availableWindows;

        let result = [...availableWindows];

        for (const subtract of subtractWindows) {
            const newResult = [];
            for (const available of result) {
                // If subtract completely contains available, remove it
                if (subtract.startTime <= available.startTime && subtract.endTime >= available.endTime) {
                    continue; // Skip this window
                }
                // If subtract is completely inside available, split available
                else if (subtract.startTime > available.startTime && subtract.endTime < available.endTime) {
                    newResult.push({
                        startTime: available.startTime,
                        endTime: subtract.startTime
                    });
                    newResult.push({
                        startTime: subtract.endTime,
                        endTime: available.endTime
                    });
                }
                // If subtract overlaps start of available
                else if (subtract.startTime <= available.startTime && subtract.endTime > available.startTime) {
                    newResult.push({
                        startTime: subtract.endTime,
                        endTime: available.endTime
                    });
                }
                // If subtract overlaps end of available
                else if (subtract.startTime < available.endTime && subtract.endTime >= available.endTime) {
                    newResult.push({
                        startTime: available.startTime,
                        endTime: subtract.startTime
                    });
                }
                // No overlap, keep available window
                else {
                    newResult.push(available);
                }
            }
            result = newResult;
        }

        return result.filter(w => w.startTime < w.endTime); // Remove invalid windows
    }

    /**
     * Apply schedule overrides
     * Overrides can replace or add special hours
     * @private
     */
    _applyOverrides(availableWindows, overrides) {
        if (overrides.length === 0) return availableWindows;

        // For now, handle simple cases:
        // - If override.isAvailable = false, remove that date from windows
        // - If override.isAvailable = true with times, replace/add those hours
        
        // Group overrides by type
        const dayOffOverrides = overrides.filter(o => !o.isAvailable);
        const specialHoursOverrides = overrides.filter(o => o.isAvailable && o.startTime && o.endTime);

        let result = [...availableWindows];

        // Remove windows for day-off dates
        for (const dayOff of dayOffOverrides) {
            const overrideDate = new Date(dayOff.date);
            result = result.filter(w => {
                const windowDate = new Date(w.startTime);
                return windowDate.toDateString() !== overrideDate.toDateString();
            });
        }

        // Add special hours
        for (const special of specialHoursOverrides) {
            const overrideDate = new Date(special.date);
            const specialStart = this._combineDateAndTime(special.date, special.startTime);
            const specialEnd = this._combineDateAndTime(special.date, special.endTime);

            // Remove existing windows for this date
            result = result.filter(w => {
                const windowDate = new Date(w.startTime);
                return windowDate.toDateString() !== overrideDate.toDateString();
            });

            // Add special hours window
            result.push({
                startTime: specialStart,
                endTime: specialEnd
            });
        }

        return result;
    }
    /**
     * Get the next available slot for a service and staff
     * Searches up to daysToSearch days (capped by NEXT_AVAILABLE_MAX_DAYS). Exits on first found slot.
     *
     * @param {string} tenantId - Tenant ID
     * @param {string} serviceId - Service ID (required)
     * @param {string} staffId - Staff ID (required)
     * @param {number} daysToSearch - Number of days to search ahead (capped by env)
     * @returns {Promise<Object>} Next available slot or clear "no slot in window" response
     */
    async getNextAvailableSlot(tenantId, { serviceId, staffId, daysToSearch = 14 }) {
        if (!serviceId || !staffId) {
            throw new Error('serviceId and staffId are required');
        }

        const rawMax = parseInt(process.env.NEXT_AVAILABLE_MAX_DAYS || '14', 10);
        const maxDays = Math.min(60, Math.max(1, Number.isNaN(rawMax) ? 14 : rawMax));
        const cappedDays = Math.min(Math.max(1, Number(daysToSearch) || 14), maxDays);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let daysSearched = 0;
        for (let i = 0; i < cappedDays; i++) {
            daysSearched = i + 1;
            const searchDate = new Date(today);
            searchDate.setDate(today.getDate() + i);
            const dateString = searchDate.toISOString().split('T')[0]; // YYYY-MM-DD

            try {
                const result = await this.getAvailableSlots(tenantId, {
                    serviceId,
                    staffId,
                    date: dateString
                });

                const availableSlot = result.slots.find(slot => slot.available);
                if (availableSlot) {
                    if (process.env.AVAILABILITY_TIMING_LOG === '1') {
                        console.log(JSON.stringify({
                            event: 'next_available_slot',
                            daysSearched,
                            found: true,
                            date: dateString,
                            daysAhead: i
                        }));
                    }
                    return {
                        success: true,
                        slot: availableSlot,
                        date: dateString,
                        daysAhead: i,
                        metadata: result.metadata
                    };
                }
            } catch (error) {
                if (process.env.NODE_ENV === 'test') {
                    // expected control flow (e.g. service not found, wrong tenant); no log
                } else if (process.env.AVAILABILITY_DEBUG_LOG === '1' && /not found|does not belong|invalid/i.test(error.message)) {
                    console.info(`Availability check ${dateString}:`, error.message);
                } else if (process.env.AVAILABILITY_DEBUG_LOG !== '1' && /not found|does not belong|invalid/i.test(error.message)) {
                    // validation/branch only; no log unless debug flag set
                } else {
                    console.error(`Error checking date ${dateString}:`, error.message);
                }
            }
        }

        if (process.env.AVAILABILITY_TIMING_LOG === '1') {
            console.log(JSON.stringify({
                event: 'next_available_slot',
                daysSearched,
                found: false
            }));
        }
        return {
            success: false,
            slot: null,
            date: null,
            daysAhead: null,
            searchedDays: cappedDays,
            message: `No availability in next ${cappedDays} days.`
        };
    }
}

module.exports = new AvailabilityService();


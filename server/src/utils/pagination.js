/**
 * Pagination helper: parse limit/offset from request and enforce max page size.
 * Use for list endpoints to avoid unbounded queries.
 *
 * @param {object} req - Express request (req.query)
 * @param {number} [defaultLimit=20] - default page size
 * @param {number} [maxPageSize=100] - maximum allowed limit
 * @returns {{ limit: number, offset: number }} - safe limit and offset
 * @throws {object} - { statusCode: 400, message } when limit > maxPageSize or invalid
 */
function parseLimitOffset(req, defaultLimit = 20, maxPageSize = 100) {
    const rawLimit = req.query.limit != null ? parseInt(req.query.limit, 10) : defaultLimit;
    const rawPage = req.query.page != null ? parseInt(req.query.page, 10) : 1;

    if (Number.isNaN(rawLimit) || rawLimit < 1) {
        const err = new Error('Invalid limit: must be a positive number');
        err.statusCode = 400;
        throw err;
    }
    if (rawLimit > maxPageSize) {
        const err = new Error(`Limit cannot exceed ${maxPageSize}`);
        err.statusCode = 400;
        throw err;
    }
    if (Number.isNaN(rawPage) || rawPage < 1) {
        const err = new Error('Invalid page: must be a positive number');
        err.statusCode = 400;
        throw err;
    }

    const limit = rawLimit;
    const offset = (rawPage - 1) * limit;
    return { limit, offset, page: rawPage };
}

/** Default max page size for list endpoints */
const DEFAULT_MAX_PAGE_SIZE = 100;

module.exports = {
    parseLimitOffset,
    DEFAULT_MAX_PAGE_SIZE
};

import api, { apiErrorMessage } from '@/lib/api';
import { toPosition, toPendingOrder, toClosedTrade, fromOrderTicket } from '@/adapters/position';

/**
 * Open trades come back with a `header` block carrying the account totals the
 * list was computed against. It is returned alongside the rows because the
 * stats bar would otherwise have to ask for the same numbers separately.
 */
const listBody = (response) => {
  const payload = response?.data ?? {};
  const body = payload.data ?? payload;
  const rows = Array.isArray(body) ? body : body.data ?? [];
  return {
    rows,
    header: payload.header ?? body.header ?? null,
    pagination: {
      page: body.current_page ?? 1,
      lastPage: body.last_page ?? 1,
      total: body.total ?? rows.length,
    },
  };
};

export const fetchOpenPositions = async ({ page = 1, search = '', symbolOf } = {}) => {
  try {
    const { rows, header, pagination } = listBody(
      await api.post(`/users/trade/index/open?page=${page}`, { search })
    );
    return { ok: true, positions: rows.map((row) => toPosition(row, symbolOf)), header, pagination };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), positions: [], header: null, pagination: null };
  }
};

export const fetchClosedTrades = async ({ page = 1, search = '', symbolOf } = {}) => {
  try {
    const { rows, pagination } = listBody(await api.post(`/users/trade/index/close?page=${page}`, { search }));
    return { ok: true, trades: rows.map((row) => toClosedTrade(row, symbolOf)), pagination };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), trades: [], pagination: null };
  }
};

/**
 * Resting orders.
 *
 * This endpoint existed the whole time and the previous interface never
 * called it — pending orders were filled in the browser, which meant an order
 * only opened while its owner happened to be looking at that instrument.
 */
export const fetchPendingOrders = async ({ symbolOf } = {}) => {
  try {
    const { rows } = listBody(await api.get('/users/Home/trade/pending'));
    return { ok: true, orders: rows.map((row) => toPendingOrder(row, symbolOf)) };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), orders: [] };
  }
};

export const createTrade = async (ticket) => {
  try {
    const payload = fromOrderTicket(ticket);
    const response = await api.post('/users/trade/create', payload, { __noRetry: true });
    return { ok: true, trade: response?.data?.data ?? response?.data ?? null };
  } catch (error) {
    const message = apiErrorMessage(error, 'The order was not accepted.');
    return {
      ok: false,
      message,
      // The server refuses trading outright for some accounts; the ticket
      // needs to know the difference between that and a rejected order.
      tradingBlocked: /not allowed to trade/i.test(message),
    };
  }
};

/**
 * Closing sends the P&L the client is looking at so the server can compare it
 * against its own before booking. The server recomputes regardless — this is
 * a cross-check, not the source of the figure.
 */
export const closePosition = async ({ id, pnl }) => {
  try {
    await api.post('/users/trade/close/trade', { id, profit: pnl }, { __noRetry: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'The position could not be closed.') };
  }
};

/**
 * One request, closed atomically server-side.
 *
 * Looping over positions from the browser would leave the account half closed
 * if the connection dropped in the middle, and would trip rate limiting on a
 * large book.
 */
export const closeAllPositions = async () => {
  try {
    await api.post('/users/trade/close/all', {}, { __noRetry: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'The positions could not be closed.') };
  }
};

/**
 * Cancelling a resting order.
 *
 * There is no dedicated endpoint; the close route is what the platform has.
 * An order that has not opened has no P&L, hence zero.
 */
export const cancelPendingOrder = async (id) => {
  try {
    await api.post('/users/trade/close/trade', { id, profit: 0 }, { __noRetry: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'The order could not be cancelled.') };
  }
};

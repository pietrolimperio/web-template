/**
 * Development-only logging utility
 *
 * Use in place of console.log to avoid logging in production.
 * Logs only when NODE_ENV is 'development', unless forceInProd is true.
 *
 * @example
 * devLog('Hello', data);                    // logs only in dev
 * devLog('Debug info', obj, { forceInProd: true });  // logs also in prod
 */

//const isDevelopment = () => process.env.NODE_ENV === 'development';
const isDevelopment = () => true;

/**
 * Logs arguments to console only in development, unless forceInProd is true.
 *
 * @param {...*} args - Values to log (same as console.log)
 * @param {Object} [options] - If the last argument is a plain object with forceInProd,
 *   it's used as options and not logged. Default: { forceInProd: false }
 */
export const devLog = (...args) => {
  let forceInProd = false;
  let logArgs = args;

  const lastArg = args[args.length - 1];
  if (
    lastArg != null &&
    typeof lastArg === 'object' &&
    !Array.isArray(lastArg) &&
    Object.prototype.toString.call(lastArg) === '[object Object]' &&
    'forceInProd' in lastArg
  ) {
    forceInProd = lastArg.forceInProd === true;
    logArgs = args.slice(0, -1);
  }

  if (isDevelopment() || forceInProd) {
    console.log(...logArgs);
  }
};

/**
 * Logs arguments to console regardless of environment.
 * Use sparingly when you need to debug in production.
 */
devLog.force = (...args) => {
  console.log(...args);
};

export default devLog;

/* The sample case happens in US Eastern time. A judge opening it from Almaty would otherwise see a 6 pm school pickup
   as "3:05 AM". When the person has a display zone, every date formatter in the app defaults to it, one switch here
   instead of a timeZone option at each of the ~20 places that format a date. Formatters that pass their own timeZone
   keep it. */
let installed = '';

export function installDisplayZone(tz?: string) {
  if (!tz || installed === tz) return;
  installed = tz;
  const withZone = <T extends Intl.DateTimeFormatOptions | undefined>(o: T): Intl.DateTimeFormatOptions => ({...(o ?? {}), timeZone: o?.timeZone ?? tz});
  const Native = Intl.DateTimeFormat;
  const Patched = function (this: unknown, locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    return new Native(locales, withZone(options));
  } as unknown as typeof Intl.DateTimeFormat;
  (Patched as unknown as {prototype: unknown}).prototype = Native.prototype;
  Patched.supportedLocalesOf = Native.supportedLocalesOf;
  Intl.DateTimeFormat = Patched;
  const d = Date.prototype;
  const ls = d.toLocaleString, lds = d.toLocaleDateString, lts = d.toLocaleTimeString;
  d.toLocaleString = function (l?: string | string[], o?: Intl.DateTimeFormatOptions) { return ls.call(this, l, withZone(o)); };
  d.toLocaleDateString = function (l?: string | string[], o?: Intl.DateTimeFormatOptions) { return lds.call(this, l, withZone(o)); };
  d.toLocaleTimeString = function (l?: string | string[], o?: Intl.DateTimeFormatOptions) { return lts.call(this, l, withZone(o)); };
}

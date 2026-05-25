export function firstParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}

export function requiredParam(value: unknown): string {
  const param = firstParam(value);
  if (!param) throw new Error('缺少必要参数');
  return param;
}

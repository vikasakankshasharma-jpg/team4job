export function normalizePhone(phone: string | undefined): string | undefined {
    if (!phone) return undefined;
    return phone.replace(/\D/g, ''); // strip non-digits
}

export function normalizeAddress(address: string | undefined): string | undefined {
    if (!address) return undefined;
    return address.toLowerCase().replace(/[^a-z0-9]/g, ''); // strip everything except alphanumeric
}

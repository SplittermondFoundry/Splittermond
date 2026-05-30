import type { User } from "module/api/foundryTypes";

export function isFirstActiveGM(currentUser: User | null | undefined, users: User[] | null | undefined): boolean {
    if (!currentUser?.isGM || !currentUser.active) {
        return false;
    }

    const connectedGMs = (users ?? []).filter((u) => u.isGM && u.active);
    return !connectedGMs.some((other) => other.id < currentUser.id);
}

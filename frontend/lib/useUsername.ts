import { useState, useEffect } from "react";

const NS       = "wp26_uname_";
const TAKEN_NS = "wp26_taken_";

const unameKey  = (addr: string) => `${NS}${addr.toLowerCase()}`;
const takenKey  = (name: string) => `${TAKEN_NS}${name.trim().toLowerCase()}`;

export function useUsername(address?: string) {
  const [username, setUsernameState] = useState<string>("");

  // Load from localStorage whenever address changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!address) { setUsernameState(""); return; }
    setUsernameState(localStorage.getItem(unameKey(address)) ?? "");
  }, [address]);

  /** Returns true if `name` is already claimed by a DIFFERENT address */
  const isTaken = (name: string): boolean => {
    if (typeof window === "undefined") return false;
    const trimmed = name.trim();
    if (!trimmed) return false;
    const owner = localStorage.getItem(takenKey(trimmed));
    if (!owner) return false;
    return owner !== address?.toLowerCase();
  };

  /** Save username + update taken registry.
   *  Passing "" means "skip / clear display name" — key is written as ""
   *  so the Navbar knows the user was already prompted and won't re-show the modal.
   *  Use clearUsername() to fully remove the key (re-enables auto-prompt). */
  const applyUsername = (name: string) => {
    if (!address || typeof window === "undefined") return;
    const trimmed = name.trim();

    // Remove old "taken" entry for this address
    const old = localStorage.getItem(unameKey(address));
    if (old) localStorage.removeItem(takenKey(old));

    // Always write the key — "" = skipped, non-empty = active username
    localStorage.setItem(unameKey(address), trimmed);
    if (trimmed) {
      localStorage.setItem(takenKey(trimmed), address.toLowerCase());
    }
    setUsernameState(trimmed);
  };

  const clearUsername = () => {
    if (!address || typeof window === "undefined") return;
    const old = localStorage.getItem(unameKey(address));
    if (old) localStorage.removeItem(takenKey(old));
    localStorage.removeItem(unameKey(address));
    setUsernameState("");
  };

  return { username, applyUsername, clearUsername, isTaken };
}

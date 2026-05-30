"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export interface AddressBookEntry {
    address: string;
    name: string;
    addedAt: number;
}

interface AddressBookContextType {
    entries: Record<string, string>; // address -> name mapping
    getName: (address: string) => string | null;
    saveName: (address: string, name: string) => void;
    removeEntry: (address: string) => void;
    allEntries: AddressBookEntry[];
}

const AddressBookContext = createContext<AddressBookContextType | undefined>(undefined);

const STORAGE_KEY = "stellar-batch-pay-address-book";
const LEGACY_STORAGE_KEYS = ["batchpay_address_book"];

type StoredAddressBookEntry = {
    id?: string;
    address?: unknown;
    name?: unknown;
    addedAt?: unknown;
};

function normalizeStoredEntries(raw: string | null): AddressBookEntry[] {
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw) as StoredAddressBookEntry[];
        if (!Array.isArray(parsed)) return [];

        return parsed.flatMap((entry) => {
            if (typeof entry.address !== "string" || typeof entry.name !== "string") {
                return [];
            }

            return [{
                address: entry.address,
                name: entry.name,
                addedAt: typeof entry.addedAt === "number" ? entry.addedAt : 0,
            }];
        });
    } catch (err) {
        console.error("Failed to parse address book:", err);
        return [];
    }
}

function mergeAddressBookEntries(entryGroups: AddressBookEntry[][]) {
    const merged = new Map<string, AddressBookEntry>();
    let importedCount = 0;

    entryGroups.forEach((entries, groupIndex) => {
        entries.forEach((entry) => {
            const existing = merged.get(entry.address);
            const shouldUseEntry = !existing || entry.addedAt >= existing.addedAt;

            if (shouldUseEntry) {
                merged.set(entry.address, entry);
            }

            if (groupIndex > 0 && shouldUseEntry) {
                importedCount += 1;
            }
        });
    });

    return {
        entries: Array.from(merged.values()).sort((a, b) => b.addedAt - a.addedAt),
        importedCount,
    };
}

export function AddressBookProvider({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const [entries, setEntries] = useState<AddressBookEntry[]>([]);
    const [initialized, setInitialized] = useState(false);

    // Load and migrate from localStorage on mount
    useEffect(() => {
        const canonicalEntries = normalizeStoredEntries(localStorage.getItem(STORAGE_KEY));
        const legacyEntries = LEGACY_STORAGE_KEYS.map((key) => normalizeStoredEntries(localStorage.getItem(key)));
        const { entries: mergedEntries, importedCount } = mergeAddressBookEntries([
            canonicalEntries,
            ...legacyEntries,
        ]);

        setEntries(mergedEntries);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedEntries));
        LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

        if (importedCount > 0) {
            toast({
                title: `Imported ${importedCount} contacts`,
                description: "Contacts from previous storage were merged into your address book.",
            });
            console.info(`Imported ${importedCount} contacts from legacy address book storage.`);
        }

        setInitialized(true);
    }, [toast]);

    // Persist to localStorage when entries change
    useEffect(() => {
        if (!initialized) return;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }, [entries, initialized]);

    const getName = useCallback((address: string) => {
        return entries.find((entry) => entry.address === address)?.name || null;
    }, [entries]);

    const saveName = useCallback((address: string, name: string) => {
        setEntries(prev => {
            const now = Date.now();
            const exists = prev.some((entry) => entry.address === address);

            if (!exists) {
                return [...prev, { address, name, addedAt: now }];
            }

            return prev.map((entry) => (
                entry.address === address ? { ...entry, name, addedAt: now } : entry
            ));
        });
    }, []);

    const removeEntry = useCallback((address: string) => {
        setEntries(prev => prev.filter((entry) => entry.address !== address));
    }, []);

    const entryMap = entries.reduce<Record<string, string>>((mapping, entry) => {
        mapping[entry.address] = entry.name;
        return mapping;
    }, {});

    const value: AddressBookContextType = {
        entries: entryMap,
        getName,
        saveName,
        removeEntry,
        allEntries: entries,
    };

    return (
        <AddressBookContext.Provider value={value}>
            {children}
        </AddressBookContext.Provider>
    );
}

export function useAddressBook() {
    const context = useContext(AddressBookContext);
    if (context === undefined) {
        throw new Error("useAddressBook must be used within an AddressBookProvider");
    }
    return context;
}

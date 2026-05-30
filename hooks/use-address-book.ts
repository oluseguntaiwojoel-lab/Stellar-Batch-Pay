import { useState, useEffect } from 'react';

export interface Contact {
  id: string;
  name: string;
  address: string;
  addedAt?: number;
}

const STORAGE_KEY = 'stellar-batch-pay-address-book';
const LEGACY_STORAGE_KEY = 'batchpay_address_book';

const parseContacts = (raw: string | null): Contact[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((contact) => {
      if (typeof contact.name !== 'string' || typeof contact.address !== 'string') {
        return [];
      }

      return [{
        id: typeof contact.id === 'string' ? contact.id : crypto.randomUUID(),
        name: contact.name,
        address: contact.address,
        addedAt: typeof contact.addedAt === 'number' ? contact.addedAt : 0,
      }];
    });
  } catch (e) {
    console.error('Failed to parse address book:', e);
    return [];
  }
};

const mergeContactsByNewestAddress = (contacts: Contact[]) => {
  const merged = new Map<string, Contact>();

  contacts.forEach((contact) => {
    const existing = merged.get(contact.address);
    if (!existing || (contact.addedAt ?? 0) >= (existing.addedAt ?? 0)) {
      merged.set(contact.address, contact);
    }
  });

  return Array.from(merged.values()).sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
};

export function useAddressBook() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const canonicalContacts = parseContacts(localStorage.getItem(STORAGE_KEY));
    const legacyContacts = parseContacts(localStorage.getItem(LEGACY_STORAGE_KEY));
    const mergedContacts = mergeContactsByNewestAddress([
      ...canonicalContacts,
      ...legacyContacts,
    ]);

    setContacts(mergedContacts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedContacts));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setIsLoading(false);
  }, []);

  const saveContacts = (newContacts: Contact[]) => {
    const normalizedContacts = newContacts.map((contact) => ({
      ...contact,
      addedAt: contact.addedAt ?? Date.now(),
    }));

    setContacts(normalizedContacts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedContacts));
  };

  const addContact = (name: string, address: string) => {
    const newContact: Contact = {
      id: crypto.randomUUID(),
      name,
      address,
      addedAt: Date.now(),
    };
    saveContacts([...contacts, newContact]);
  };

  const updateContact = (id: string, name: string, address: string) => {
    saveContacts(
      contacts.map((c) => (c.id === id ? { ...c, name, address, addedAt: Date.now() } : c))
    );
  };

  const deleteContact = (id: string) => {
    saveContacts(contacts.filter((c) => c.id !== id));
  };

  const exportContacts = () => {
    const dataStr = JSON.stringify(contacts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'stellar-batch-pay-contacts.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importContacts = (jsonStr: string) => {
    try {
      const imported = JSON.parse(jsonStr);
      if (Array.isArray(imported)) {
        // Basic validation
        const valid = imported.every(
          (c) => typeof c.name === 'string' && typeof c.address === 'string'
        );
        if (valid) {
          const merged = [...contacts];
          imported.forEach((newContact) => {
            if (!merged.find((m) => m.address === newContact.address)) {
              merged.push({
                id: newContact.id || crypto.randomUUID(),
                name: newContact.name,
                address: newContact.address,
                addedAt: newContact.addedAt || Date.now(),
              });
            }
          });
          saveContacts(merged);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Failed to import contacts:', e);
      return false;
    }
  };

  return {
    contacts,
    isLoading,
    addContact,
    updateContact,
    deleteContact,
    exportContacts,
    importContacts,
  };
}

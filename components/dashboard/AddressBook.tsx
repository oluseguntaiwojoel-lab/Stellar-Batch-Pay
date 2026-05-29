"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserPlus,
  Trash2,
  Edit2,
  Download,
  Upload,
  Search,
  User,
  Copy,
  Check,
  X,
  ExternalLink
} from "lucide-react";
import { useAddressBook, Contact } from "@/hooks/use-address-book";
import { toast } from "sonner";
import { useWallet } from "@/contexts/WalletContext";

export function AddressBook() {
  const {
    contacts,
    addContact,
    updateContact,
    deleteContact,
    exportContacts,
    importContacts
  } = useAddressBook();
  const { expectedNetwork } = useWallet();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: "", address: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredContacts = contacts.filter(
    (c) => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      toast.error("Please fill in both name and address");
      return;
    }
    addContact(formData.name, formData.address);
    setFormData({ name: "", address: "" });
    setIsAdding(false);
    toast.success("Contact added successfully");
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateContact(editingId, formData.name, formData.address);
    setEditingId(null);
    setFormData({ name: "", address: "" });
    toast.success("Contact updated successfully");
  };

  const startEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setFormData({ name: contact.name, address: contact.address });
    setIsAdding(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Address copied to clipboard");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importContacts(content)) {
        toast.success("Contacts imported successfully");
      } else {
        toast.error("Failed to import contacts. Invalid format.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search contacts by name or address..."
            className="pl-10 bg-slate-900/50 border-slate-800 text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-slate-800 text-slate-300 hover:bg-slate-800"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            className="border-slate-800 text-slate-300 hover:bg-slate-800"
            onClick={exportContacts}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setFormData({ name: "", address: "" });
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {(isAdding || editingId) && (
        <Card className="bg-slate-900/50 border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              {editingId ? "Edit Contact" : "Add New Contact"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Name</label>
                  <Input
                    placeholder="e.g. Payroll Account"
                    className="bg-slate-950 border-slate-800 text-white"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Stellar Address</label>
                  <Input
                    placeholder="G..."
                    className="bg-slate-950 border-slate-800 text-white font-mono"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  {editingId ? "Save Changes" : "Save Contact"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Name</th>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Address</th>
                <th className="text-right p-4 text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    {searchQuery ? "No contacts found matching your search." : "Your address book is empty."}
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 font-bold text-xs">
                          {contact.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{contact.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 font-mono text-sm text-slate-400">
                        <span className="truncate max-w-[200px] sm:max-w-xs">{contact.address}</span>
                        <button
                          onClick={() => handleCopy(contact.id, contact.address)}
                          className="p-1 hover:text-emerald-500 transition-colors"
                        >
                          {copiedId === contact.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                        <a
                          href={`https://stellar.expert/explorer/${expectedNetwork}/account/${contact.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                          onClick={() => startEdit(contact)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this contact?")) {
                              deleteContact(contact.id);
                              toast.success("Contact deleted");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

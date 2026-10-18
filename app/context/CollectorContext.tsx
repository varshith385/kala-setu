"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "./AuthContext";

export interface NamedCollection {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  artworkIds: string[];
  createdAt: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  queryString: string;
  createdAt: string;
}

export interface SavedAddress {
  id: string;
  label: string; // e.g. "Home", "Office"
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

interface CollectorContextType {
  collections: NamedCollection[];
  createCollection: (name: string, description?: string) => string;
  deleteCollection: (id: string) => void;
  addToCollection: (collectionId: string, artworkId: string) => void;
  removeFromCollection: (collectionId: string, artworkId: string) => void;
  toggleArtworkInCollection: (collectionId: string, artworkId: string) => void;
  followedArtists: string[];
  toggleFollowArtist: (artistId: string) => void;
  isFollowingArtist: (artistId: string) => boolean;
  savedSearches: SavedSearch[];
  addSavedSearch: (name: string, queryString: string) => void;
  removeSavedSearch: (id: string) => void;
  addresses: SavedAddress[];
  addAddress: (addr: Omit<SavedAddress, "id">) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
}

const CollectorContext = createContext<CollectorContextType | null>(null);

export function CollectorProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `kala_collector_${user.id}` : "kala_collector_guest";

  const [collections, setCollections] = useState<NamedCollection[]>([
    {
      id: "col-default",
      name: "Primary Favorites",
      description: "Default curated collector list",
      isPrivate: true,
      artworkIds: ["art-001"],
      createdAt: new Date().toISOString(),
    },
  ]);

  const [followedArtists, setFollowedArtists] = useState<string[]>(["artist-001"]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([
    {
      id: "search-1",
      name: "Deccan & Mughal Gold Foil",
      queryString: "tradition=Deccan",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([
    {
      id: "addr-1",
      label: "Primary Residence",
      name: "Collector Residence",
      phone: "+91 98765 43210",
      address: "Banjara Hills, Road No. 12, Hyderabad, Telangana 500034",
      isDefault: true,
    },
  ]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const isHydrated = useRef(false);

  // Restore on mount or user session change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.collections) setCollections(parsed.collections);
        if (parsed.followedArtists) setFollowedArtists(parsed.followedArtists);
        if (parsed.savedSearches) setSavedSearches(parsed.savedSearches);
        if (parsed.addresses) setAddresses(parsed.addresses);
        if (typeof parsed.notificationsEnabled === "boolean") {
          setNotificationsEnabled(parsed.notificationsEnabled);
        }
      }
    } catch {
      // Storage unavailable or parsing error safely ignored
    } finally {
      isHydrated.current = true;
    }
  }, [storageKey]);

  // Persist to user-isolated localStorage
  useEffect(() => {
    if (!isHydrated.current) return;
    try {
      const dataToSave = {
        collections,
        followedArtists,
        savedSearches,
        addresses,
        notificationsEnabled,
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch {
      // Storage unavailable safely ignored
    }
  }, [storageKey, collections, followedArtists, savedSearches, addresses, notificationsEnabled]);

  const createCollection = (name: string, description = "") => {
    const newId = `col-${Date.now()}`;
    const newCol: NamedCollection = {
      id: newId,
      name: name.trim() || "Untitled Collection",
      description: description.trim(),
      isPrivate: true,
      artworkIds: [],
      createdAt: new Date().toISOString(),
    };
    setCollections((prev) => [...prev, newCol]);
    return newId;
  };

  const deleteCollection = (id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  const addToCollection = (collectionId: string, artworkId: string) => {
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id === collectionId && !c.artworkIds.includes(artworkId)) {
          return { ...c, artworkIds: [...c.artworkIds, artworkId] };
        }
        return c;
      })
    );
  };

  const removeFromCollection = (collectionId: string, artworkId: string) => {
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id === collectionId) {
          return { ...c, artworkIds: c.artworkIds.filter((id) => id !== artworkId) };
        }
        return c;
      })
    );
  };

  const toggleArtworkInCollection = (collectionId: string, artworkId: string) => {
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id === collectionId) {
          const exists = c.artworkIds.includes(artworkId);
          return {
            ...c,
            artworkIds: exists
              ? c.artworkIds.filter((id) => id !== artworkId)
              : [...c.artworkIds, artworkId],
          };
        }
        return c;
      })
    );
  };

  const toggleFollowArtist = (artistId: string) => {
    setFollowedArtists((prev) =>
      prev.includes(artistId) ? prev.filter((id) => id !== artistId) : [...prev, artistId]
    );
  };

  const isFollowingArtist = (artistId: string) => followedArtists.includes(artistId);

  const addSavedSearch = (name: string, queryString: string) => {
    const newSearch: SavedSearch = {
      id: `srch-${Date.now()}`,
      name: name.trim() || "Saved Search",
      queryString,
      createdAt: new Date().toISOString(),
    };
    setSavedSearches((prev) => [newSearch, ...prev]);
  };

  const removeSavedSearch = (id: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  };

  const addAddress = (addr: Omit<SavedAddress, "id">) => {
    const newAddr: SavedAddress = {
      ...addr,
      id: `addr-${Date.now()}`,
    };
    setAddresses((prev) => {
      if (newAddr.isDefault) {
        return [...prev.map((a) => ({ ...a, isDefault: false })), newAddr];
      }
      return [...prev, newAddr];
    });
  };

  const deleteAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const setDefaultAddress = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
  };

  const toggleNotifications = () => {
    setNotificationsEnabled((prev) => !prev);
  };

  return (
    <CollectorContext.Provider
      value={{
        collections,
        createCollection,
        deleteCollection,
        addToCollection,
        removeFromCollection,
        toggleArtworkInCollection,
        followedArtists,
        toggleFollowArtist,
        isFollowingArtist,
        savedSearches,
        addSavedSearch,
        removeSavedSearch,
        addresses,
        addAddress,
        deleteAddress,
        setDefaultAddress,
        notificationsEnabled,
        toggleNotifications,
      }}
    >
      {children}
    </CollectorContext.Provider>
  );
}

export function useCollector() {
  const context = useContext(CollectorContext);
  if (!context) {
    throw new Error("useCollector must be used within CollectorProvider");
  }
  return context;
}

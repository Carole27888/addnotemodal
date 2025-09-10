
"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
};

const MOCK_USERS: User[] = [
  { id: "1", name: "Abdulraheem Fareed", email: "", phoneNumber: "", role: "", status: "" },
  { id: "2", name: "Carole Mutemi", email: "", phoneNumber: "", role: "", status: "" },
  { id: "3", name: "Carole Wanjiku", email: "", phoneNumber: "", role: "", status: "" },
  { id: "4", name: "Carole Kim", email: "", phoneNumber: "", role: "", status: "" },
  { id: "5", name: "Caroline Njeri", email: "", phoneNumber: "", role: "", status: "" },
];

interface AddNoteModalProps {
  users?: User[];
}

const AddNoteModal = ({ users: usersProp }: AddNoteModalProps) => {
  const [note, setNote] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionedUsers, setMentionedUsers] = useState<User[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const hasFetchedUsers = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  // Build normalized search key for a user mention
  function mentionTokenFor(user: User) {
    return `@${user.name}`;
  }

  // Return all [start, end) ranges in `text` for current mentioned users
  function getMentionRanges(text: string, mentions: User[]) {
    const ranges: Array<{ start: number; end: number; id: string }> = [];
    for (const u of mentions) {
      const token = mentionTokenFor(u);
      let from = 0;
      while (true) {
        const idx = text.indexOf(token, from);
        if (idx === -1) break;
        ranges.push({ start: idx, end: idx + token.length, id: u.id });
        from = idx + token.length;
      }
    }
    // sort by start just to be safe
    ranges.sort((a, b) => a.start - b.start);
    return ranges;
  }

  // Is `pos` inside any mention? returns that range or null
  function getMentionRangeAt(text: string, mentions: User[], pos: number) {
    const ranges = getMentionRanges(text, mentions);
    for (const r of ranges) {
      if (pos > r.start && pos < r.end) return r; // strictly inside
    }
    return null;
  }

  // Is `pos` immediately after a mention (caret at the end)?
  function getMentionEndingAt(text: string, mentions: User[], pos: number) {
    const ranges = getMentionRanges(text, mentions);
    return ranges.find((r) => pos === r.end) || null;
  }

  useEffect(() => {
    const initialUsers = usersProp && usersProp.length > 0 ? usersProp : MOCK_USERS;
    setUsers(initialUsers);
    setFilteredUsers(initialUsers);
  }, [usersProp]);

  const handleAddClick = () => {
    setShowDropdown(true);
    setHighlightIndex(0);
    setFilteredUsers(users);
  };

  const fetchUsersOnce = async () => {
    if (hasFetchedUsers.current) return; // cache guard
    hasFetchedUsers.current = true; // mark early to avoid double calls
    setLoadingUsers(true);
    try {
      const res = await fetch("https://jsonplaceholder.typicode.com/users", {
        cache: "no-store",
      });
      const data = await res.json();
      const mapped: User[] = data.map((u: any) => ({
        id: String(u.id),
        name: u.name,
        email: "",
        phoneNumber: "",
        role: "",
        status: "",
      }));
      setUsers(mapped);
      // If a mention query is already open, also update the visible list
      setFilteredUsers((prev) =>
        mentionQuery
          ? mapped.filter((u) =>
              u.name.toLowerCase().includes(mentionQuery.toLowerCase())
            )
          : mapped
      );
    } catch (err) {
      console.error("users fetch failed:", err);
      // Fallback so UI still works
      setUsers(MOCK_USERS);
      setFilteredUsers(MOCK_USERS);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChangeNote = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNote(value);

    const selStart = e.target.selectionStart ?? value.length;
    const before = value.slice(0, selStart);

    const atMatch = before.match(/@([A-Za-z0-9_]*)$/);

    if (!atMatch) {
      setMentionQuery("");
      setShowDropdown(false);
      return;
    }

    const query = atMatch[1].trim().toLowerCase();

    // If query is empty, show all users
    const filtered = query
  ? users
      .filter((u) => 
        u.name.toLowerCase().includes(query) &&
        !mentionedUsers.some((m) => m.id === u.id) 
      )
  : users.filter((u) => !mentionedUsers.some((m) => m.id === u.id)); 


    // call the network only the first time @ is used
    if (!hasFetchedUsers.current) fetchUsersOnce();

    setMentionQuery(query);
    setFilteredUsers(filtered);
    setShowDropdown(true);
    setHighlightIndex(0);
  };

  const insertMention = (user: User) => {
    console.log(`${user.id} | ${user.name} was mentioned`);

    const el = textareaRef.current;
    const cursorPos = el?.selectionStart ?? note.length;
    const before = note.slice(0, cursorPos);
    const after = note.slice(cursorPos);

    const beforeWithoutQuery = before.replace(/@([A-Za-z0-9_ ]*)$/, "");
    const toInsert = `@${user.name} `;
    const updated = `${beforeWithoutQuery}${toInsert}${after}`;

    // to avoid duplicate mentions
    setMentionedUsers((prev) => {
      if (prev.some((u) => u.id === user.id)) return prev;
      return [...prev, user];
    });

    setNote(updated);
    setShowDropdown(false);
    setMentionQuery("");

    // Restore caret right after inserted token
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = beforeWithoutQuery.length + toInsert.length;
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = pos;
      }
    });
  };

  const submitNote = () => {
    const payload = {
      text: note.trim(),
      mentions: mentionedUsers.map((u) => ({ id: u.id, name: u.name })),
    };
    console.log("NOTE_SUBMITTED:", payload);

    setNote("");
    setMentionedUsers([]);
    setUsers(MOCK_USERS);
    setFilteredUsers(MOCK_USERS);
    setShowDropdown(false);
    setMentionQuery("");
    setHighlightIndex(0);
  };

  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;
    const pos = el?.selectionStart ?? note.length;

    // 🔹 Check if caret is inside a mention
    const inside = getMentionRangeAt(note, mentionedUsers, pos);
    if (inside) {
      // block normal typing inside token
      if (e.key.length === 1 || e.key === "Enter") {
        e.preventDefault();
        requestAnimationFrame(() => {
          const el2 = textareaRef.current;
          if (!el2) return;
          el2.selectionStart = el2.selectionEnd = inside.end;
        });
        return;
      }

      // remove entire token if Backspace/Delete is pressed
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();

        const before = note.slice(0, inside.start).replace(/\s+$/, " ");
        const after = note.slice(inside.end).replace(/^\s+/, " ");
        const updated = (before + after).replace(/\s{2,}/g, " ");
        setNote(updated);

        const tokenText = note.slice(inside.start, inside.end);
        const removedUser = mentionedUsers.find((u) => tokenText === `@${u.name}`);
        if (removedUser) {
          const stillHas = getMentionRanges(updated, [removedUser]).length > 0;
          if (!stillHas) {
            setMentionedUsers((prev) => prev.filter((u) => u.id !== removedUser.id));
          }
        }

        requestAnimationFrame(() => {
          const el2 = textareaRef.current;
          if (!el2) return;
          const newPos = before.length;
          el2.selectionStart = el2.selectionEnd = newPos;
        });
        return;
      }
    }

    // ⬇️ keep your existing Enter & Backspace logic here

    // ...existing Enter/Backspace logic below...
    if (e.key === "Enter") {
      if (showDropdown && filteredUsers.length > 0) {
        e.preventDefault();
        insertMention(filteredUsers[highlightIndex]);
        return;
      }
      e.preventDefault();
      if (note.trim().length > 0) submitNote();
      return;
    }

    if (e.key === "Backspace") {
      const before = note.slice(0, pos);
      const after = note.slice(pos);

      const mentionToken = before.match(/@[A-Za-z0-9_]+(?:\s[A-Za-z0-9_]+)*\s?$/);
      if (mentionToken) {
        e.preventDefault();
        const newBefore = before.replace(/@[A-Za-z0-9_]+(?:\s[A-Za-z0-9_]+)*\s?$/, "");
        const updated = `${newBefore}${after}`;
        setNote(updated);
        setShowDropdown(false);
        setMentionQuery("");

        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newBefore.length;
          }
        });
      }
    }
  };

  // Global keyboard nav for dropdown (ArrowUp/Down handled here)
  useEffect(() => {
    if (!showDropdown || filteredUsers.length === 0) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % filteredUsers.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + filteredUsers.length) % filteredUsers.length);
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showDropdown, filteredUsers]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!showDropdown) return;
    const el = itemRefs.current[highlightIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, showDropdown]);

  return (
    isOpen ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <h2 className="text-base font-medium text-gray-900">Add Note</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            <div className="relative">
              <label className="block text-sm text-gray-700 mb-2">
                Note
              </label>

              <textarea
                ref={textareaRef}
                className="w-full px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white resize-none min-h-[40px] max-h-[200px] overflow-y-auto placeholder:text-gray-400"
                placeholder="Add a note to this request. Mention team members with @ to notify them."
                value={note}
                onChange={handleChangeNote}
                rows={1}
                style={{ height: "auto" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 200) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.shiftKey) return;
                  handleKeyDownTextarea(e);
                }}
                // 🔹 NEW: Prevent typing inside mention tokens
                onBeforeInput={(e) => {
                  const el = textareaRef.current;
                  if (!el) return;
                  const pos = el.selectionStart ?? 0;
                  const inside = getMentionRangeAt(note, mentionedUsers, pos);
                  if (inside) {
                    e.preventDefault();
                    // snap caret to the end of the token
                    requestAnimationFrame(() => {
                      const el2 = textareaRef.current;
                      if (!el2) return;
                      el2.selectionStart = el2.selectionEnd = inside.end;
                    });
                  }
                }}
                // 🔹 NEW: Snap caret if user clicks inside a token
                onSelect={() => {
                  const el = textareaRef.current;
                  if (!el) return;
                  const pos = el.selectionStart ?? 0;
                  const inside = getMentionRangeAt(note, mentionedUsers, pos);
                  if (inside) {
                    el.selectionStart = el.selectionEnd = inside.end;
                  }
                }}
              />

              {/* Dropdown for mentions */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  role="listbox"
                  aria-label="Mention results"
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 max-h-48 overflow-y-auto"
                >
                  {loadingUsers ? (
                    <div className="p-2 space-y-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-6 rounded bg-gray-100 animate-pulse" />
                      ))}
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No users found</div>
                  ) : (
                    filteredUsers.map((user, i) => (
                      <div
                        key={user.id}
                        className={`p-2 text-sm cursor-pointer ${
                          i === highlightIndex
                            ? "bg-blue-600 text-white font-medium ring-1 ring-blue-700"
                            : "hover:bg-gray-100"
                        }`}
                        onMouseEnter={() => setHighlightIndex(i)}
                        onClick={() => insertMention(user)}
                        role="option"
                        aria-selected={i === highlightIndex}
                        ref={(el) => (itemRefs.current[i] = el)}
                      >
                        {user.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Button */}
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => {
                  if (note.trim().length > 0) submitNote();
                }}
                className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-300 px-4 py-1.5 text-sm rounded"
              >
                Add Note
              </Button>
            </div>
          </div>
        </div>
      </div>
    ) : null
  );
};

export default AddNoteModal;
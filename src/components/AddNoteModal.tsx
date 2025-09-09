
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
  const [isOpen, setIsOpen] = useState(true); 

  
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

  //  If query is empty, show all users
  const filtered = query
    ? users.filter((u) => u.name.toLowerCase().includes(query))
    : users;

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
    const updated = `${beforeWithoutQuery}${toInsert}${after}`;;

    //to avoid duplicate mentions
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
    const selStart = el?.selectionStart ?? note.length;

    
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
      const before = note.slice(0, selStart);
      const after = note.slice(selStart);

      
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
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.shiftKey) return;
                  handleKeyDownTextarea(e);
                }}
              />

              {/* Dropdown for mentions */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No users found</div>
                  ) : (
                    filteredUsers.map((user, i) => (
                      <div
                        key={user.id}
                        className={`p-2 text-sm cursor-pointer ${
                          i === highlightIndex
                            ? "bg-blue-500 text-white"
                            : "hover:bg-gray-100"
                        }`}
                        onMouseEnter={() => setHighlightIndex(i)}
                        onClick={() => insertMention(user)}
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
"use client";

import React from "react";
import {
  ChevronDown,
  ChevronsRight,
  Settings,
  HelpCircle,
  LucideIcon,
  Home,
  Users,
} from "lucide-react";

export interface SidebarItem {
  id: string;
  title: string;
  icon: LucideIcon;
  notifs?: number;
}

export interface CollapsibleSidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selected: string;
  setSelected: (id: string) => void;
  items?: SidebarItem[];
  bottomItems?: SidebarItem[];
  brandTitle?: string;
  brandSubtitle?: string;
  brandIcon?: React.ReactNode;
}

export const CollapsibleSidebar = ({
  open,
  setOpen,
  selected,
  setSelected,
  items,
  bottomItems,
  brandTitle = "TutorCRM",
  brandSubtitle = "Zero-Budget Manager",
  brandIcon,
}: CollapsibleSidebarProps) => {
  const defaultItems: SidebarItem[] = [
    { id: "/", title: "Dashboard", icon: Home },
    { id: "/students", title: "Students", icon: Users },
  ];

  const defaultBottomItems: SidebarItem[] = [
    { id: "Settings", title: "Settings", icon: Settings },
    { id: "Help & Support", title: "Help & Support", icon: HelpCircle },
  ];

  const navItems = items || defaultItems;
  const navBottomItems = bottomItems || defaultBottomItems;

  return (
    <nav
      className={`hidden md:flex sticky top-0 h-screen shrink-0 border-r transition-all duration-300 ease-in-out z-30 ${
        open ? "w-64" : "w-16"
      } border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm flex-col justify-between`}
    >
      <div>
        <TitleSection
          open={open}
          brandTitle={brandTitle}
          brandSubtitle={brandSubtitle}
          brandIcon={brandIcon}
        />

        <div className="space-y-1 mb-6">
          {navItems.map((item) => (
            <Option
              key={item.id}
              Icon={item.icon}
              title={item.title}
              selected={selected}
              setSelected={() => setSelected(item.id)}
              open={open}
              notifs={item.notifs}
            />
          ))}
        </div>

        {open && navBottomItems.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Account
            </div>
            {navBottomItems.map((item) => (
              <Option
                key={item.id}
                Icon={item.icon}
                title={item.title}
                selected={selected}
                setSelected={() => setSelected(item.id)}
                open={open}
                notifs={item.notifs}
              />
            ))}
          </div>
        )}
      </div>

      <ToggleClose open={open} setOpen={setOpen} />
    </nav>
  );
};

interface OptionProps {
  Icon: LucideIcon;
  title: string;
  selected: string;
  setSelected: () => void;
  open: boolean;
  notifs?: number;
}

export const Option = ({ Icon, title, selected, setSelected, open, notifs }: OptionProps) => {
  const isSelected = selected === title;

  return (
    <button
      onClick={setSelected}
      className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
        isSelected
          ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-xs border-l-2 border-indigo-600"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
      }`}
    >
      <div className="grid h-full w-12 place-content-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>

      {open && (
        <span
          className={`text-sm font-medium transition-opacity duration-200 truncate ${
            open ? "opacity-100" : "opacity-0"
          }`}
        >
          {title}
        </span>
      )}

      {notifs !== undefined && notifs > 0 && open && (
        <span className="ml-auto mr-3 flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-indigo-600 text-xs text-white font-medium">
          {notifs}
        </span>
      )}
    </button>
  );
};

interface TitleSectionProps {
  open: boolean;
  brandTitle?: string;
  brandSubtitle?: string;
  brandIcon?: React.ReactNode;
}

export const TitleSection = ({
  open,
  brandTitle = "TutorCRM",
  brandSubtitle = "Zero-Budget Manager",
  brandIcon,
}: TitleSectionProps) => {
  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
        <div className="flex items-center gap-3 overflow-hidden">
          {brandIcon || <Logo />}
          {open && (
            <div className={`transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"} overflow-hidden`}>
              <div className="flex items-center gap-2">
                <div>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {brandTitle}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                    {brandSubtitle}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {open && (
          <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
        )}
      </div>
    </div>
  );
};

export const Logo = () => {
  return (
    <div className="grid size-10 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm text-white">
      <svg
        width="20"
        height="auto"
        viewBox="0 0 50 39"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="fill-white"
      >
        <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z" />
        <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z" />
      </svg>
    </div>
  );
};

export const ToggleClose = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full border-t border-gray-200 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
    >
      <div className="flex items-center p-3">
        <div className="grid size-10 place-content-center shrink-0">
          <ChevronsRight
            className={`h-4 w-4 transition-transform duration-300 text-gray-500 dark:text-gray-400 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
        {open && (
          <span
            className={`text-sm font-medium text-gray-600 dark:text-gray-300 transition-opacity duration-200 ${
              open ? "opacity-100" : "opacity-0"
            }`}
          >
            Collapse
          </span>
        )}
      </div>
    </button>
  );
};

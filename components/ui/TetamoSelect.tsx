"use client";

import * as React from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";

type Option = {
  value: string;
  label: string;
};

export function TetamoSelect({
  value,
  onChange,
  placeholder = "Pilih",
  options,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options: Option[];
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#1C1C1E] outline-none focus:border-[#1C1C1E] data-[placeholder]:text-gray-400"
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon asChild>
          <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-gray-500" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          align="start"
          sideOffset={6}
          className="z-50 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-gray-200 bg-white text-[#1C1C1E] shadow-lg"
        >
          <Select.Viewport className="max-h-72 overflow-y-auto p-2">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 pr-10 text-sm text-[#1C1C1E] outline-none hover:bg-gray-50 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100"
              >
                <Select.ItemText>{option.label}</Select.ItemText>

                <Select.ItemIndicator className="absolute right-3 inline-flex items-center">
                  <Check className="h-4 w-4 text-[#1C1C1E]" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  options: readonly SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({
  ariaLabel,
  className = "",
  disabled = false,
  id,
  options,
  value,
  onChange,
}: SelectFieldProps<T>) {
  function handleChange(event: SelectChangeEvent<T>): void {
    onChange(event.target.value as T);
  }

  return (
    <Select<T>
      aria-label={ariaLabel}
      className={`app-select ${className}`.trim()}
      disabled={disabled}
      IconComponent={KeyboardArrowDownIcon}
      id={id}
      MenuProps={{
        slotProps: {
          paper: {
            className: "app-select-menu",
          },
        },
      }}
      value={value}
      onChange={handleChange}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
}

export type { SelectOption };

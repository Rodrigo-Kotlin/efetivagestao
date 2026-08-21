import type { TextFieldProps } from "./TextField";
import { TextField } from "./TextField";

export type SearchFieldProps = Omit<TextFieldProps, "type">;

export function SearchField(props: SearchFieldProps) {
  return <TextField {...props} type="search" className={`eg-search ${props.className ?? ""}`.trim()} />;
}

import { DropdownMenu, MenuItem } from "@/components/ui";
import { AppIcon } from "./AppIcon";

interface UserMenuProps {
  name: string;
  email?: string;
  organization?: string;
  onSignOut: () => void | Promise<void>;
}

export function UserMenu({ name, email, organization, onSignOut }: UserMenuProps) {
  const initial = name.charAt(0).toUpperCase() || "?";
  return (
    <DropdownMenu
      className="eg-user-menu"
      label="Abrir menu do usuário"
      trigger={
        <>
          <span className="eg-user-menu__avatar" aria-hidden="true">{initial}</span>
          <span className="eg-user-menu__trigger-copy">
            <strong>{name}</strong>
            {organization ? <small>{organization}</small> : null}
          </span>
          <span className="eg-user-menu__chevron"><AppIcon name="chevron" /></span>
        </>
      }
    >
      <div className="eg-user-menu__summary" role="none">
        <span className="eg-user-menu__avatar" aria-hidden="true">{initial}</span>
        <span>
          <strong>{name}</strong>
          {email ? <small>{email}</small> : null}
          {organization ? <small>{organization}</small> : null}
        </span>
      </div>
      <div className="eg-user-menu__divider" role="separator" />
      <MenuItem tone="destructive" onClick={() => void onSignOut()}>
        <span className="eg-user-menu__item-icon"><AppIcon name="logout" /></span>
        Sair
      </MenuItem>
    </DropdownMenu>
  );
}

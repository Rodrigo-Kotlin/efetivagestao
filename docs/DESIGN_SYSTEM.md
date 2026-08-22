# Efetiva Design System

The Efetiva design foundation follows a **Forest Precision** direction: calm green accents, restrained tonal surfaces, compact information hierarchy, and explicit operational states. It is informed by Material 3 roles without depending on a component framework.

This foundation is incremental. Existing feature screens keep their behavior and can adopt primitives as they are maintained; broad visual rewrites are intentionally out of scope.

## Principles

1. Use color by semantic role, not by hex value or visual preference.
2. Reserve the primary green for actions, selection, focus, and high-value emphasis.
3. Build hierarchy with typography, spacing, and tonal surfaces before adding borders or elevation.
4. Keep operational data compact, but preserve a 44px minimum touch target for interactive controls.
5. Communicate status with text and semantics; color is supporting information only.
6. Prefer visible labels and nearby help over placeholder-only instructions.
7. Animate state changes briefly and disable non-essential motion when the user requests reduced motion.

## Foundation

Global tokens live in `src/styles/tokens.css`. Global element defaults and accessibility rules live in `src/styles/global.css`. The application self-hosts the Inter variable font through `@fontsource-variable/inter`.

Use Material-style semantic roles for new work:

```css
.example {
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-interactive);
  padding: var(--md-sys-spacing-4);
}
```

The token groups are:

| Group | Prefix | Purpose |
| --- | --- | --- |
| Color | `--md-sys-color-*` | Surfaces, content, borders, actions, and semantic feedback |
| Typography | `--md-sys-typescale-*` | Display, headline, title, body, and label hierarchy |
| Spacing | `--md-sys-spacing-*` | A 4px-based spacing scale |
| Shape | `--md-sys-shape-*` | Control, card, container, and circular radii |
| Elevation | `--md-sys-elevation-*` | Four restrained shadow levels |
| Motion | `--md-sys-motion-*` | Duration and easing roles |
| State | `--md-sys-state-*` | Hover, focus, pressed, and disabled opacity |
| Density | `--md-sys-density-*` | Compact and comfortable control dimensions |
| Layout | `--md-sys-layout-*` | Content widths and responsive gutters |

Legacy aliases such as `--color-primary`, `--space-4`, and `--radius-md` remain available during migration. Do not add new aliases or use legacy names in new primitives.

The semantic architecture is ready for a future dark theme: override role values under a theme selector rather than changing component selectors.

## UI Primitives

Import UI primitives from `@/components/ui`:

```tsx
import { Alert, Button, Card, StatusChip, TextField } from "@/components/ui";

<Card>
  <TextField label="Nome" supportingText="Nome visível para a equipe." />
  <StatusChip tone="positive">Ativa</StatusChip>
  <Alert tone="warning">Existem pendências.</Alert>
  <Button>Salvar</Button>
</Card>
```

| Primitive | Intended use |
| --- | --- |
| `Button` | Filled, tonal, outlined, text, and destructive actions; supports loading state |
| `IconButton` | Compact icon action with a mandatory accessible name |
| `Card` | A meaningful contained region, not a default wrapper for every block |
| `Badge` | Short metadata or identifiers |
| `StatusChip` | Text-backed workflow and record status |
| `TextField` | Labeled text input with support and error association |
| `Select` | Labeled native selection control |
| `SearchField` | Search input with a programmatic `searchbox` role |
| `Checkbox` | Independent binary choice with optional description |
| `Radio` | One option inside a labeled native `fieldset` group |
| `Switch` | Immediate on/off presentation or setting |
| `Divider` | Visual grouping separator |
| `Spinner` | Short indeterminate loading state with an accessible label |
| `Skeleton` | Content-shape placeholder; hidden from assistive technology |
| `EmptyState` | Empty result or first-use explanation and a next action |
| `Alert` | Inline informational, success, warning, or error feedback |
| `Dialog` | Focus-managed modal interaction with Escape and focus restoration |
| `Drawer` | Focus-managed temporary side panel for mobile navigation or contextual tasks |
| `DropdownMenu` / `MenuItem` | Keyboard-operable action menu with Escape and arrow-key navigation |
| `Table` | Scroll-contained native table with a required caption |

Use `statusTone()` when adapting backend status values. Unknown values intentionally return `neutral`; the visible backend value should still be rendered.

## Layout Primitives

Import layout primitives from `@/components/layout`:

```tsx
import { PageContainer, PageHeader, ResponsiveGrid, Section, Stack } from "@/components/layout";

<PageContainer>
  <PageHeader title="Tabelas comerciais" description="Gerencie versões e vigências." />
  <Section title="Versões">
    <ResponsiveGrid minItemWidth="large">
      <Stack>{/* content */}</Stack>
    </ResponsiveGrid>
  </Section>
</PageContainer>
```

`PageContainer` controls readable width and responsive gutters through `standard`, `wide`, and `full` variants. Use `full` for dense ERP views that productively consume the available shell width. `PageHeader` provides breadcrumbs, title hierarchy, description, primary action, secondary actions, and overflow actions. `Section` groups related content. `Stack`, `Cluster`, and `ResponsiveGrid` cover vertical flow, wrapping inline flow, and responsive columns without one-off inline style objects.

## Adaptive Application Shell

The authenticated shell uses three navigation modes without changing the route tree:

| Viewport | Navigation pattern |
| --- | --- |
| Below 768px | Sticky top app bar and modal navigation drawer |
| 768px to 1199px | Persistent compact navigation rail |
| 1200px and above | Persistent 272px navigation drawer |

Navigation entries come from `src/layouts/app-shell/navigation.ts`. An entry is rendered only when it has a real route, is marked available, and the current user has at least one required permission. Do not render disabled placeholders for planned modules in the application shell.

The top app bar derives contextual labels from the current path and exposes only implemented actions. The user menu preserves identity, organization, and sign-out; settings, notifications, and global search must not be added until corresponding functionality exists.

Temporary navigation uses `Drawer`, including focus entry, Tab containment, Escape dismissal, body scroll lock, and focus restoration. Persistent navigation uses `NavLink`, preserving direct refresh, browser history, and `aria-current="page"` for nested routes.

## Density

Controls support `comfortable` and `compact` density where a denser mode is useful. Comfortable is the default. Compact reduces visual height while retaining a minimum interactive target through the control box and spacing model.

Use compact density for repeated filters and data-table controls. Do not use it to compress destructive confirmations, authentication, or infrequent configuration forms.

## Accessibility

- Keep the global `:focus-visible` ring intact.
- Supply `aria-label` to every `IconButton` whose children do not form a meaningful accessible name.
- Give every input a visible `label`; primitives connect support and error text through `aria-describedby`.
- Put `Radio` controls in a `fieldset` with a `legend`.
- Provide a useful `caption` to `Table`; it may be visually hidden.
- Keep status text visible and specific. Never use a green/red distinction as the only status signal.
- `Dialog` moves focus inside, traps Tab navigation, closes with Escape, locks background scroll, and restores focus to the trigger.
- Respect `prefers-reduced-motion`; global rules remove non-essential animation and smooth scrolling.

## Adoption

For an existing screen:

1. Preserve behavior, permissions, data flow, and tests.
2. Replace local status maps with `StatusChip` plus `statusTone()` where meanings align.
3. Replace repeated control styling with the matching primitive.
4. Replace structural inline styles with layout primitives.
5. Move exceptional page styling to a co-located CSS file using semantic tokens.
6. Verify keyboard flow, responsive behavior, loading, empty, error, and disabled states.

Do not perform a page-wide redesign merely to adopt the system. Small, reviewable migrations are preferred.

## Showcase

The authenticated `/design-system` route demonstrates tokens, controls, statuses, data density, feedback, and modal behavior. The route is added only when `import.meta.env.DEV` is true and is absent from production route configuration.

Run the application with `npm run dev`, authenticate normally, and visit `/design-system`.

## Verification

Changes to the foundation must pass:

```sh
npm run lint
npm run typecheck
npm run test:run
npm run build
git diff --check
```

Add interaction tests when a primitive changes keyboard, focus, labeling, loading, or dismissal behavior.

## UIX-02R1 — Visual Refinement & Composition Patterns

These patterns fix inconsistencies exposed during the first production-screen migrations.

### PageHeader variants

`PageHeader` exposes three intentional density variants:

| Variant | Title size | Use case |
| --- | --- | --- |
| `standard` (default) | Headline-large (2rem) | Dashboards and module landing pages |
| `compact` | Headline-small (1.5rem) | List subpages and forms |
| `entity` | Headline-small (1.5rem) with `max-width: 48ch` and `text-wrap: balance` | Detail pages with potentially long legal names |

```tsx
<PageHeader variant="standard" title="Preços & Exames" />
<PageHeader variant="compact" title="Novo Item" breadcrumbs={...} />
<PageHeader variant="entity" title={supplier.legal_name} breadcrumbs={...} />
```

**Do** use the variant API. **Do not** hardcode font sizes in feature pages.

### Action hierarchy

Use the action slots intentionally:

| Slot | Purpose |
| --- | --- |
| `primaryAction` | Single most important next step |
| `secondaryActions` | Frequent contextual action (one only) |
| `overflowActions` | Low-frequency or destructive actions behind `DropdownMenu` |
| `actions` | Legacy general slot when slot-based design is not needed |

```tsx
<PageHeader
  title="Fornecedor"
  primaryAction={<Button>Editar</Button>}
  overflowActions={
    <DropdownMenu label="Mais ações" trigger="Mais">
      <MenuItem onClick={onBlock}>Bloquear</MenuItem>
      <MenuItem onClick={onInactivate}>Inativar</MenuItem>
    </DropdownMenu>
  }
/>
```

**Do not** render three to five equally weighted buttons next to a title.

### KPI / MetricCard

`KPI` is a content-only metric primitive. **Do not** place it inside a card.

```tsx
// ✅ Preferred — MetricCard owns the surface
<MetricCard surface="tonal" label="Itens Ativos" value={123} />

// ❌ Nested surface — do not do this
<Card>
  <KPI label="Itens Ativos" value={123} />
</Card>
```

`surface` accepts `flat`, `tonal`, or `outlined`. Use `interactive` when the entire card is a link target.

### DetailGrid / DetailField

Render entity metadata without a card per field:

```tsx
<section className="eg-section">
  <h3 className="eg-section__title">Dados da empresa</h3>
  <DetailGrid columns={2}>
    <DetailField label="Razão Social" value={company.legal_name} />
    <DetailField label="CNPJ" value={company.tax_id} mono />
    <DetailField label="Observações" value={company.notes} span={2} />
  </DetailGrid>
</section>
```

`columns` adapts: 2–4 on desktop, 2 on tablet, 1 on mobile. `span` overrides column placement for long values.

### Tabs

Use `SimpleTabs` for declarative tab sets or `Tabs` + `TabList` + `Tab` + `TabPanel` for compound usage:

```tsx
<SimpleTabs
  items={[
    { key: "geral", label: "Geral", panel: <GeralSection /> },
    { key: "map", label: "Mapeamentos", panel: <MappingsSection /> },
  ]}
  defaultActiveKey="geral"
  ariaLabel="Seções do fornecedor"
/>
```

Tabs include keyboard navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`), proper `role="tablist"`, `aria-selected`, and `aria-controls`. **Do not** build ad hoc tab buttons.

### FilterBar / Toolbar

`FilterBar` (chip-based) and `Toolbar` (toolbar with sections and dividers) are available. For list pages with search + filters, compose them inside the `eg-toolbar` CSS class:

```tsx
<div className="eg-toolbar">
  <div className="eg-toolbar__search">
    <SearchField label="Buscar" />
  </div>
  <div className="eg-toolbar__filters">
    <Select label="Categoria" density="compact" />
    <Select label="Status" density="compact" />
  </div>
</div>
```

Mobile: the toolbar stacks vertically at the 48rem breakpoint.

### StatusBadge labels

`StatusBadge` now maps backend status values to human-readable Portuguese labels via `statusLabel()`:

```tsx
<StatusBadge status="active" />   // renders "Ativo" with positive tone
<StatusBadge status="blocked" />  // renders "Bloqueado" with negative tone
<StatusBadge status="draft" />    // renders "Rascunho" with warning tone
```

Status values supported: `active`, `inactive`, `blocked`, `draft`, `published`, `approved`, `paid`, `scheduled`, `cancelled`, `archived`, `pending`, `expired`, `revoked`, `rejected`, `review`, `superseded`, `partial`, `suspended` (both English and Portuguese variants). Unknown values render the original string with neutral tone. Tone is secondary — the text is the primary signal.

### Iconography

Module and action icons are monochrome SVG (`AppIcon`), 20–24px, using semantic color tokens. **Do not** use emoji as permanent production icons.

### Card nesting

Cards represent independent objects or grouped surfaces. **Do not** nest `<Card>` components or wrap every section in a card. Use `eg-section` + section title + subtle divider for flat hierarchical structure.

### Surface reduction

Build hierarchy with typography, spacing, and tonal surfaces before reaching for borders or additional cards. Reserve cards for genuine grouped surfaces.

### Module card hierarchy

On dashboards, distinguish available modules (clickable, prominent) from future modules (quieter, non-interactive):

```tsx
<Link className="eg-module-card" data-state="available">...</Link>
<div className="eg-module-card" data-state="future">...</div>
```

Do not render a "Disponível" badge on clearly active clickable cards — the interactive visual state conveys availability. Reserve status chips for "Em breve" and "Em desenvolvimento".

### Breadcrumb rules

| Route | Breadcrumb |
| --- | --- |
| `/pricing` | None required (top app bar shows context) |
| `/pricing/catalog` | None required |
| `/pricing/suppliers` | None required |
| `/pricing/suppliers/:id` | Useful (entity detail) |
| `/pricing/catalog/new` | Useful (form subpage) |

Do not automatically add breadcrumbs to every first-level page.

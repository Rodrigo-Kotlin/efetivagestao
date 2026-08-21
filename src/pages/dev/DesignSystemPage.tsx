import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Divider,
  EmptyState,
  IconButton,
  Radio,
  SearchField,
  Select,
  Skeleton,
  Spinner,
  StatusChip,
  Switch,
  Table,
  TextField,
} from "@/components/ui";
import {
  Cluster,
  PageContainer,
  PageHeader,
  ResponsiveGrid,
  Section,
  Stack,
} from "@/components/layout";
import "./design-system.css";

const colorRoles = [
  ["primary", "Ação e seleção"],
  ["primary-container", "Ênfase tonal"],
  ["surface", "Plano da aplicação"],
  ["surface-container", "Agrupamento"],
  ["on-surface", "Conteúdo principal"],
  ["outline", "Limites e estrutura"],
] as const;

export function DesignSystemPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <PageContainer size="wide" className="eg-design-system">
      <PageHeader
        eyebrow="UIX-00 · Forest Precision"
        title="Efetiva Design System"
        description="Fundação Material 3 para interfaces corporativas precisas, densas e tranquilas. Esta rota existe somente em desenvolvimento."
        actions={<Badge tone="accent">Development only</Badge>}
      />

      <Alert tone="info" title="Fundação, não redesign">
        Os componentes abaixo definem contratos visuais e acessíveis. A migração das telas de negócio será incremental.
      </Alert>

      <Section
        title="Cor por função"
        description="O verde institucional identifica ação e seleção; superfícies tonais constroem a maior parte da hierarquia."
      >
        <div className="eg-token-strip" role="list" aria-label="Papéis de cor">
          {colorRoles.map(([role, description]) => (
            <div className="eg-color-token" data-color-role={role} role="listitem" key={role}>
              <span className="eg-color-token__sample" aria-hidden="true" />
              <span><strong>{role}</strong><small>{description}</small></span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia" description="Inter, hierarquia compacta e números tabulares para leitura operacional.">
        <Card>
          <Stack gap="4">
            <div className="eg-type-sample" data-type-role="headline-large">Headline large · 32/40</div>
            <div className="eg-type-sample" data-type-role="headline-small">Headline small · 24/32</div>
            <div className="eg-type-sample" data-type-role="title-medium">Title medium · 16/24</div>
            <div className="eg-type-sample" data-type-role="body-medium">Body medium · Informação operacional clara e direta.</div>
            <div className="eg-type-sample" data-type-role="numeric">R$ 128.450,3200</div>
          </Stack>
        </Card>
      </Section>

      <Section title="Ações" description="Uma ação dominante por região; alternativas perdem ênfase progressivamente.">
        <Card>
          <Cluster gap="3">
            <Button>Salvar alterações</Button>
            <Button variant="tonal">Simular</Button>
            <Button variant="outlined">Exportar</Button>
            <Button variant="text">Cancelar</Button>
            <Button variant="destructive">Excluir</Button>
            <Button loading>Processando</Button>
            <IconButton aria-label="Ajuda sobre esta seção" variant="tonal">?</IconButton>
          </Cluster>
        </Card>
      </Section>

      <Section title="Formulários" description="Labels persistentes, ajuda próxima e erro conectado ao controle.">
        <ResponsiveGrid minItemWidth="large" gap="4">
          <Card>
            <Stack gap="4">
              <TextField label="Nome da tabela" placeholder="Ex.: Empresarial Sul" required supportingText="Nome visível para a equipe comercial." />
              <SearchField label="Buscar item" placeholder="Código ou descrição" density="compact" />
              <Select label="Situação inicial" defaultValue="active">
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </Select>
              <TextField label="Código externo" defaultValue="TAB-2026" error="Este código já está em uso." />
            </Stack>
          </Card>
          <Card tone="low">
            <Stack gap="4">
              <Checkbox label="Aplicar a todos os itens selecionados" description="A operação continua sujeita às validações do backend." />
              <fieldset className="eg-choice-group">
                <legend>Densidade preferida</legend>
                <Radio name="density" label="Confortável" defaultChecked />
                <Radio name="density" label="Compacta" />
              </fieldset>
              <Switch label="Exibir detalhes avançados" description="Preferência apenas de apresentação." />
            </Stack>
          </Card>
        </ResponsiveGrid>
      </Section>

      <Section title="Estados semânticos" description="Texto permanece obrigatório; cor nunca comunica o estado sozinha.">
        <Card>
          <Stack gap="4">
            <Cluster gap="2">
              <StatusChip tone="positive">Ativa</StatusChip>
              <StatusChip tone="info">Em revisão</StatusChip>
              <StatusChip tone="warning">Pendente</StatusChip>
              <StatusChip tone="negative">Bloqueada</StatusChip>
              <StatusChip>Substituída</StatusChip>
              <Badge mono>TAB-EMP-01</Badge>
            </Cluster>
            <Divider />
            <ResponsiveGrid minItemWidth="large" gap="3">
              <Alert tone="positive" title="Publicação concluída">A versão está disponível na vigência definida.</Alert>
              <Alert tone="warning" title="Revisão necessária">Existem exceções comerciais pendentes.</Alert>
              <Alert tone="negative" title="Não foi possível salvar">Revise os campos indicados e tente novamente.</Alert>
            </ResponsiveGrid>
          </Stack>
        </Card>
      </Section>

      <Section title="Dados compactos" description="Tabela contida, cabeçalhos claros e altura adequada para leitura financeira.">
        <Table caption="Amostra de preços comerciais" density="compact">
          <thead>
            <tr><th scope="col">Código</th><th scope="col">Item</th><th scope="col">Preço</th><th scope="col">Status</th></tr>
          </thead>
          <tbody>
            <tr><td>EX-001</td><td>Exame ocupacional</td><td className="eg-numeric">R$ 128,4500</td><td><StatusChip tone="positive">Publicado</StatusChip></td></tr>
            <tr><td>SV-014</td><td>Visita técnica</td><td className="eg-numeric">R$ 320,0000</td><td><StatusChip tone="info">Agendado</StatusChip></td></tr>
          </tbody>
        </Table>
      </Section>

      <Section title="Carregamento e ausência" description="Feedback discreto, sem animar dados rotineiros.">
        <ResponsiveGrid minItemWidth="large" gap="4">
          <Card>
            <Stack gap="4">
              <Cluster gap="3"><Spinner /><span>Atualizando resultados</span></Cluster>
              <Skeleton lines={3} />
              <Skeleton variant="block" />
            </Stack>
          </Card>
          <EmptyState
            icon="0"
            title="Nenhum resultado"
            description="Ajuste os filtros ou cadastre o primeiro registro para continuar."
            actions={<Button variant="tonal">Limpar filtros</Button>}
          />
        </ResponsiveGrid>
      </Section>

      <Section title="Camadas temporárias" description="Diálogos usam foco controlado, Escape, restauração e conteúdo rotulado.">
        <Button variant="outlined" onClick={() => setDialogOpen(true)}>Abrir diálogo de exemplo</Button>
      </Section>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Confirmar publicação"
        description="Revise a vigência antes de confirmar."
        footer={
          <>
            <Button variant="text" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => setDialogOpen(false)}>Confirmar</Button>
          </>
        }
      >
        <Alert tone="warning">A publicação cria um snapshot comercial imutável.</Alert>
      </Dialog>
    </PageContainer>
  );
}

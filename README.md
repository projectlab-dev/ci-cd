# ci-cd-default

Projeto de referencia para validar uma esteira padronizada de CI/CD em monorepo **Node.js**, com deteccao de alteracoes por pasta, build paralelo de imagens Docker e deploy por stack no Portainer.

## Objetivo

Este repositorio existe para provar um fluxo reutilizavel com:

- validacao de pull requests por servico
- build e push apenas dos servicos alterados
- deploy promovido por branch
- healthcheck e rollback automatico
- release automatica em producao

Esta implementacao e **exclusiva para Node.js**. Se o projeto usar outra stack, o workflow precisa ser ajustado.

## Estrutura Do Projeto

```text
.
|-- .github/
|   |-- deploy-state/
|   |-- workflows/
|   `-- services.json
|-- backend/
|-- frontend/
|-- landing/
|-- compose.yaml
|-- VERSION
`-- doc/
```

## Catalogo De Servicos

Os servicos monitorados pela pipeline sao definidos em `.github/services.json`.

Exemplo:

```json
{
  "services": [
    {
      "name": "backend",
      "folder": "backend",
      "dockerfile": "backend/Dockerfile",
      "image": "backend"
    },
    {
      "name": "frontend",
      "folder": "frontend",
      "dockerfile": "frontend/Dockerfile",
      "image": "frontend"
    }
  ]
}
```

Se um novo servico for adicionado ao catalogo, `deploy.yml` e `pr-validation.yml` passam a considera-lo sem precisar criar novos blocos fixos no YAML.

## Workflows

### `pr-validation.yml`

Executa em pull requests abertos para `dev`, `stage` e `main`.

Para cada servico alterado:

- `npm ci`
- `npm run lint --if-present`
- `npm test`
- `npm run build`

Tambem roda um scan de seguranca com Trivy.

### `deploy.yml`

Executa quando um pull request e mergeado ou por `workflow_dispatch`.

Fluxo:

1. Resolve o ambiente alvo.
2. Le o `.github/services.json`.
3. Detecta quais servicos mudaram.
4. Builda e publica imagens em paralelo.
5. Em `stage` e `prod`, aciona o webhook da stack no Portainer.
6. Executa healthcheck.
7. Se falhar, faz rollback.
8. Em `prod`, cria tag e GitHub Release.

## Promocao Entre Branches

- `feature/* -> dev`
- `dev -> stage`
- `stage -> main`

Mapeamento de ambiente:

- `dev`: `NODE_ENV=development` e `APP_ENV=development`
- `stage`: `NODE_ENV=production` e `APP_ENV=staging`
- `main`: `NODE_ENV=production` e `APP_ENV=production`

## Estrutura Obrigatoria De Cada Servico

Cada servico listado no catalogo precisa ter:

- `package.json`
- `package-lock.json`
- `Dockerfile`
- script `build`
- script `test`

## Configuracao Minima No GitHub

Secrets obrigatorios:

- `REGISTRY_URL`
- `REGISTRY_USERNAME`
- `REGISTRY_PASSWORD`
- `DEPLOY_CONFIG_STAGE`
- `DEPLOY_CONFIG_PROD`

O arquivo `VERSION` deve conter `major.minor`, por exemplo:

```text
1.0
```

## Teste Local

Para validar os servicos localmente:

```bash
docker compose up --build -d
docker compose ps
docker compose down
```

## Teste Da Pipeline

Fluxo sugerido:

1. Criar uma branch `feature/test-pipeline`
2. Abrir PR para `dev`
3. Validar o `pr-validation.yml`
4. Fazer merge e validar o `deploy.yml` em `dev`
5. Promover `dev -> stage`
6. Promover `stage -> main`

## Documentacao

Documentacao operacional detalhada:

- `doc/pipeline.md`

Arquivo de concepcao:

- `doc/idea.md`

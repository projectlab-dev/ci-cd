# Pipeline

## Objetivo

Esta pipeline padroniza o CI/CD de um monorepo **Node.js** com servicos independentes. Ela detecta alteracoes por pasta, gera imagens Docker apenas para os servicos alterados e faz deploy por stack no Portainer para `stage` e `prod`.

Esta implementacao e **exclusiva para Node.js**. Se o projeto usar outra tecnologia, a pipeline precisa ser ajustada antes de ser reutilizada.

## Promocao Entre Branches

- `feature/* -> dev`
- `dev -> stage`
- `stage -> main`

O workflow por `pull_request` so aceita merge nessas promocoes.

## Ambientes

| Branch | Ambiente do workflow | Deploy automatico | Release |
| --- | --- | --- | --- |
| `dev` | `dev` | nao | nao |
| `stage` | `stage` | sim | nao |
| `main` | `prod` | sim | sim |

## Como A Pipeline Funciona

1. Resolve o ambiente alvo a partir do branch ou do `workflow_dispatch`.
2. Carrega o catalogo de servicos em `.github/services.json`.
3. Valida se cada servico do catalogo segue a estrutura Node.js esperada.
4. Detecta quais servicos tiveram alteracao.
5. Gera a tag imutavel do build.
6. Faz build e push das imagens em paralelo apenas para os servicos alterados.
7. Em `stage` e `prod`, aciona o webhook da stack no Portainer.
8. Executa healthcheck dos servicos configurados para o ambiente.
9. Se o healthcheck falhar, faz rollback das floating tags para o ultimo estado valido, aciona novamente o webhook e falha o workflow.
10. Se o deploy em `prod` for bem-sucedido, cria tag Git e GitHub Release.

## Workflows Do Projeto

O repositorio possui dois workflows principais:

- `deploy.yml`: faz build, push, deploy, healthcheck, rollback e release
- `pr-validation.yml`: valida pull requests abertos usando o mesmo `.github/services.json`

O `pr-validation.yml` roda apenas para os servicos cujas pastas mudaram no PR e executa:

- `npm ci`
- `npm run lint --if-present`
- `npm test`
- `npm run build`

Se um novo servico for adicionado ao `.github/services.json`, os dois workflows passam a considera-lo sem necessidade de criar novos blocos fixos no YAML.

## Estrutura Obrigatoria Do Repositorio

O projeto precisa ter, no minimo:

- `.github/workflows/deploy.yml`
- `.github/services.json`
- `.github/deploy-state/stage.json`
- `.github/deploy-state/prod.json`
- `VERSION`

O arquivo `VERSION` deve conter `major.minor`. Exemplo:

```text
1.0
```

## Catalogo De Servicos

O arquivo `.github/services.json` define quais pastas participam da pipeline.

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

Campos obrigatorios por servico:

- `name`: identificador usado no workflow e no JSON de deploy
- `folder`: pasta do servico no repositorio
- `dockerfile`: caminho do Dockerfile a partir da raiz do repositorio
- `image`: sufixo da imagem publicada no registry

O catalogo nao define portas locais de Docker Compose. Isso fica no `compose.yaml`, porque e uma necessidade de execucao local, nao da pipeline do GitHub.

## Estrutura Obrigatoria De Cada Servico

Cada servico declarado no catalogo precisa ser um projeto Node.js com:

- `<folder>/package.json`
- `<folder>/package-lock.json`
- `<folder>/Dockerfile` ou outro caminho informado em `dockerfile`
- script `build` em `package.json`
- script `test` em `package.json`

O Dockerfile atual do projeto espera uma aplicacao Node.js com `npm ci`, `npm run test` e `npm run build`.

Exemplo minimo de `package.json`:

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "start": "node dist/server.js"
  }
}
```

## Secrets Obrigatorios

### Comuns

- `REGISTRY_URL`
- `REGISTRY_USERNAME`
- `REGISTRY_PASSWORD`

### Somente Ambientes Com Deploy

- `DEPLOY_CONFIG_STAGE`
- `DEPLOY_CONFIG_PROD`

Cada secret de deploy deve ser um JSON com este formato:

```json
{
  "webhook_url": "https://portainer.example/webhook",
  "health_urls": {
    "backend": "https://backend.example/health",
    "frontend": "https://frontend.example/health",
    "landing": "https://landing.example/health"
  }
}
```

Regras:

- `webhook_url` deve apontar para o webhook da stack no Portainer.
- As chaves de `health_urls` devem bater exatamente com os `name` definidos em `.github/services.json`.
- O workflow so valida healthcheck dos servicos selecionados para aquele deploy.

## Versionamento Das Imagens

- `dev`: `dev-<sha-curto>` e `dev-latest`
- `stage`: `stage-<sha-curto>` e `stage-latest`
- `prod`: `v<major>.<minor>.<github.run_number>` e `latest`

O arquivo `VERSION` so e usado na promocao para `main`.

## Variaveis De Ambiente Da Aplicacao

A pipeline separa duas responsabilidades:

- `NODE_ENV`: modo de execucao do runtime Node.js
- `APP_ENV`: identificacao do ambiente da esteira

Mapeamento atual:

- `dev`: `NODE_ENV=development` e `APP_ENV=development`
- `stage`: `NODE_ENV=production` e `APP_ENV=staging`
- `prod`: `NODE_ENV=production` e `APP_ENV=production`

Esse desenho evita usar `NODE_ENV=staging`, porque muitas bibliotecas Node tratam qualquer valor diferente de `production` como comportamento de desenvolvimento.

## Rollback

O rollback usa os arquivos:

- `.github/deploy-state/stage.json`
- `.github/deploy-state/prod.json`

Cada arquivo guarda a ultima tag imutavel valida por servico. Se um healthcheck falhar, a pipeline:

1. Reaponta a floating tag do ambiente para a ultima tag valida de cada servico.
2. Reaciona o webhook da stack.
3. Falha o workflow.

No primeiro deploy bem-sucedido do ambiente, esse estado passa a existir.

## Execucao Manual

O workflow aceita `workflow_dispatch` com:

- `environment`: `dev`, `stage` ou `prod`
- `services`: lista separada por virgula com nomes do `.github/services.json`, ou `all`

Exemplos:

- `backend,frontend`
- `landing`
- `all`

## Validacao Local

O arquivo `compose.yaml` existe para validar localmente os tres servicos de exemplo do repositorio. Ele nao participa da pipeline do GitHub, mas ajuda a provar:

- build dos Dockerfiles
- inicializacao dos containers
- healthcheck local

Comandos:

```bash
docker compose up --build -d
docker compose ps
docker compose down
```

## Limite Da Solucao

Esta pipeline foi desenhada para projetos Node.js com build/test via `npm` e empacotamento por Dockerfile Node. Para usar outra stack, ajuste pelo menos:

- validacoes do catalogo no workflow
- scripts executados no Dockerfile
- estrutura esperada por servico
- documentacao operacional

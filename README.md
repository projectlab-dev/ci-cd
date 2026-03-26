# ci-cd-default

Projeto de referência para validar uma esteira padronizada de CI/CD em monorepo **Node.js**, com detecção de alterações por pasta, build paralelo de imagens Docker e deploy por stack no Portainer.

## Objetivo

Este repositório serve como prova de conceito para um fluxo reutilizável que contempla:

- **Validação de Pull Requests** por serviço individual.
- **Build e Push** inteligente (apenas para os serviços alterados).
- **Deploy promovido por branch** (GitFlow adaptado).
- **Healthcheck e Rollback** automático pós-deploy.
- **Release automática** em produção com versionamento.

Esta implementacao e **exclusiva para Node.js**. Se o projeto usar outra stack, o workflow precisa ser ajustado.

## Estrutura do Projeto

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

## Catálogo de Serviços

Os serviços monitorados pela pipeline são centralizados em `.github/services.json`.

**Exemplo de configuração:**

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

Ao adicionar um novo serviço ao catálogo, os arquivos `deploy.yml` e `pr-validation.yml` passam a considerá-lo automaticamente, eliminando a necessidade de criar blocos fixos e redundantes no YAML.

## Workflows

### `pr-validation.yml`

Executado em Pull Requests abertos para as branches `dev`, `stage` e `main`.

Para cada serviço detectado como alterado, o workflow executa:

- `npm ci` (instalação limpa de dependências).
- `npm run lint --if-present`.
- `npm test` (testes unitários/integração).
- `npm run build`
- **Security Scan:** Varredura de vulnerabilidades utilizando o Trivy.

### `deploy.yml`

Executado após o merge de um Pull Request ou via gatilho manual (`workflow_dispatch`).

**Fluxo de execução:**

1. Resolução do ambiente alvo (Development, Staging ou Production).
2. Leitura do arquivo .github/services.json.
3. Detecção de serviços com alterações em relação à branch anterior.
4. **Build e Publish:** Geração e envio das imagens Docker em paralelo para o Registry.
5. **Portainer Integration:** Acionamento do webhook da stack no Portainer (em stage e prod).
6. **Healthcheck:** Verificação automática da integridade do serviço.
7. **Rollback:** Reversão automática em caso de falha no healthcheck.
8. **Release:** Criação de tag Git e GitHub Release (exclusivo para main).

## Promoção entre Branches

O fluxo de promoção segue a hierarquia:

- `feature/* -> dev`
- `dev -> stage`
- `stage -> main`

Mapeamento de variáveis de ambiente:

- `dev`: `NODE_ENV=development`
- `stage`: `NODE_ENV=production`
- `main`: `NODE_ENV=production`

## Estrutura Obrigatória de cada Serviço

Para garantir a compatibilidade com a pipeline, cada pasta de serviço deve conter:

- `package.json` e `package-lock.json`.
- `Dockerfile`.
- Scripts de `build` e `test` definidos no `package.json`.

## Configuração Mínima no GitHub

As seguintes **Secrets** devem ser configuradas no repositório:

- `REGISTRY_URL`, `REGISTRY_USERNAME` e `REGISTRY_PASSWORD`.
- `DEPLOY_CONFIG_STAGE` e `DEPLOY_CONFIG_PROD` (configurações específicas do Portainer/Webhook).

Exemplo de `DEPLOY_CONFIG_STAGE`:

```json
{
  "webhook_url": "https://portainer.example/webhook-stage",
  "health_urls": {
    "backend": "https://stage-backend.example/health",
    "frontend": "https://stage-frontend.example/health",
    "landing": "https://stage-landing.example/health"
  }
}
```

Exemplo de `DEPLOY_CONFIG_PROD`:

```json
{
  "webhook_url": "https://portainer.example/webhook-prod",
  "health_urls": {
    "backend": "https://prod-backend.example/health",
    "frontend": "https://prod-frontend.example/health",
    "landing": "https://prod-landing.example/health"
  }
}
```

O arquivo `VERSION` na raiz deve conter o padrão `major.minor`, por exemplo:

```text
1.0
```

## Teste Local

Para validar os serviços e o Docker Compose localmente:

```bash
docker compose up --build -d
docker compose ps
docker compose down
```

## Para validar os serviços e o Docker Compose localmente:

Fluxo sugerido:

1. Criar uma branch de funcionalidade: `feature/test-pipeline`.
2. Abrir um PR apontando para `dev`.
3. Validar a execução do `pr-validation.yml`.
4. Realizar o merge e validar o `deploy.yml` no ambiente de **dev**.
5. Promover as alterações seguindo o fluxo: `dev` → `stage` → `main`.

## Documentação Adicional

Documentacao operacional detalhada:

- [Documentação operacional detalhada da pipeline](doc/pipeline.md)

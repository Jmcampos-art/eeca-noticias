# Configuração segura do Firebase

O portal não contém mais usuários ou senhas no frontend. Para colocá-lo em produção, conclua as etapas abaixo no projeto Firebase `eeca-noticia-97e28`.

## 1. Authentication

Em **Authentication > Sign-in method**:

1. habilite **E-mail/senha** para a equipe;
2. habilite **Anônimo** para comentários, ouvidoria e pedidos de música;
3. em **Settings > Authorized domains**, mantenha somente os domínios realmente usados;
4. crie uma conta individual para cada administrador ou diretor;
5. remova ou troque imediatamente a antiga senha que estava exposta no JavaScript.

## 2. Papéis administrativos

As regras aceitam as custom claims `role: "admin"` e `role: "diretor"`. Claims só podem ser emitidas em ambiente confiável com o Firebase Admin SDK.

Exemplo conceitual executado em uma máquina administrativa segura:

```js
await getAuth().setCustomUserClaims(uid, { role: 'admin' });
```

Nunca execute o Admin SDK no navegador e nunca coloque a credencial de conta de serviço no site. Depois de alterar uma claim, a pessoa deve sair e entrar novamente para renovar o token.

## 3. Regras

Teste antes do deploy:

```powershell
firebase emulators:start --only auth,database,storage,hosting
```

Depois publique:

```powershell
firebase deploy --only database,storage
```

As regras incluídas garantem que:

- notícias e programação sejam públicas para leitura;
- visitantes autenticados anonimamente possam criar apenas suas próprias submissões;
- a caixa de entrada e anexos da ouvidoria sejam privados;
- somente `admin` e `diretor` possam publicar, moderar ou excluir;
- tamanhos e formatos sejam validados no servidor.

## 4. App Check

Ative App Check para Realtime Database, Storage e Authentication usando reCAPTCHA Enterprise. Primeiro monitore as métricas; depois habilite enforcement. Isso reduz automação abusiva, mas não substitui as regras.

## 5. Migração dos dados antigos

Faça backup antes de alterar as regras. Os registros antigos podem não possuir `uid`, `resumo`, `categoria`, `imagemPath` ou timestamps numéricos. Eles continuam legíveis, mas devem ser normalizados antes de serem editados.

As fotos antigas armazenadas em base64 devem ser migradas para Storage e substituídas por URL e `imagemPath`.

## 6. Privacidade e retenção

Defina com a direção da escola:

- responsável pelo tratamento dos dados;
- prazo de retenção de mensagens e anexos;
- canal para correção e exclusão;
- quais pessoas podem acessar a ouvidoria;
- procedimento de resposta a incidentes.

Configure uma rotina de exclusão para anexos órfãos e mensagens vencidas.

## 7. Antes do lançamento

- [ ] domínio HTTPS configurado;
- [ ] contas individuais e claims testadas;
- [ ] regras verificadas no Emulator;
- [ ] App Check em enforcement;
- [ ] backup exportado;
- [ ] formulários testados em celular e computador;
- [ ] responsável pela privacidade identificado;
- [ ] monitoramento de erros e custos ativado;
- [ ] alertas de orçamento configurados no Google Cloud.

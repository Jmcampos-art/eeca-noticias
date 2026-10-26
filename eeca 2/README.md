# EECA Notícias

Portal responsivo da comunidade escolar, construído com HTML, CSS e JavaScript modular. O backend utiliza Firebase Authentication, Realtime Database e Storage.

## Recursos

- notícias com busca, leitura detalhada e comentários;
- ouvidoria privada com anexo protegido;
- pedidos e programação da Rádio EECA;
- painel administrativo protegido por conta e custom claim;
- temas claro e escuro;
- interface responsiva e acessível;
- CSP e demais cabeçalhos de segurança;
- regras versionadas do Realtime Database e Storage.

## Execução local

O site usa módulos JavaScript e precisa ser servido por HTTP:

```powershell
python -m http.server 8080
```

Abra `http://localhost:8080`. A abertura direta de `index.html` pelo Explorador não é suportada.

## Implantação

Conclua primeiro todas as etapas de [FIREBASE_SETUP.md](FIREBASE_SETUP.md). Depois:

```powershell
firebase deploy --only database,storage,hosting
```

Nunca adicione uma chave de conta de serviço, senha ou segredo ao repositório.

## Estrutura

- `index.html`: conteúdo semântico, formulários e diálogos;
- `style.css`: design system responsivo;
- `script.js`: UI, autenticação e integração Firebase;
- `database.rules.json`: autorização e validação do banco;
- `storage.rules`: acesso seguro aos uploads;
- `firebase.json`: hosting, CSP, cache e configuração de deploy.

## Operação

- Use contas individuais para cada integrante da equipe.
- Remova imediatamente o papel de pessoas que deixarem a função.
- Revise a caixa de entrada e pedidos de rádio regularmente.
- Exporte backups do Realtime Database antes de mudanças estruturais.
- Teste regras no Firebase Emulator antes de cada deploy.

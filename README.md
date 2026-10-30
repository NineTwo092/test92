# YouTube AdBlock Local — 0.1.0
Extensão própria, de código aberto (MIT), Manifest V3, para Windows e navegadores Chromium 120+. Interface em português. Versão inicial instalável; eficácia real e reprodução ainda aguardam testes autorizados.

## Instalação sem VS Code
1. No Edge, no perfil Default usado pelo atalho do YouTube Music, acesse edge://extensions.
2. Ative Modo do desenvolvedor e escolha Carregar sem compactação.
3. Selecione a pasta extension deste projeto (a pasta com manifest.json).
4. Fixe a extensão na barra pelo menu de extensões. Recarregue YouTube e feche/reabra a janela do Music.
No Chrome, use chrome://extensions e o mesmo procedimento. Compatibilidade com outros Chromium depende do suporte às APIs; não validada em sessões reais. Política corporativa pode impedir carregamento local.
O ZIP em dist contém a pasta extension. Extraia antes de carregar e mantenha a pasta; ZIP não é instalador automático nem CRX assinado. Não requer npm install, assinatura externa ou editor.

## Uso e YouTube Music no Windows
Abra o painel da extensão e ative/desative YouTube e Music separadamente. Alterações cosméticas se aplicam às páginas carregadas e regras de rede às próximas requisições; requisições já iniciadas não são revertidas. Se houver problema, desligue o filtro do site e recarregue.
O Music identificado é PWA do Edge, perfil Default, não Electron. O módulo B reutiliza a extensão no mesmo perfil, sem alterar aplicativos. A Microsoft documenta que PWAs compartilham extensões do Edge; o funcionamento específico ainda precisa de validação. Consulte docs/DIAGNOSTICO.md. Não é necessário instalar outro aplicativo.

## Arquitetura e limites
- Regras estáticas DNR separadas por site bloqueiam doubleclick.net, googleadservices.com e caminhos /pagead/ do YouTube somente quando iniciadas por www.youtube.com ou music.youtube.com.
- Tipos limitados a script, image, xmlhttprequest, sub_frame e ping; não há bloqueio global, de media, googlevideo.com, youtubei ou /videoplayback.
- CSS oculta renderizadores publicitários identificados, incluindo espaços promocionais. Seletores podem envelhecer. CSS cobre alterações dinâmicas sem varrer o DOM, timers ou MutationObserver.
- Não altera JSON do player, velocidade, mute, posição, autenticação, DRM ou controles de assinatura. Anúncios dentro do fluxo, anúncios servidos nos mesmos endpoints do conteúdo e novas variantes podem permanecer. Não promete 100% nem equivalência a bloqueadores maduros. Regras conservadoras podem ter cobertura limitada, especialmente no Music.
- Nenhuma evidência de bloqueio real foi coletada nesta máquina ainda; testes unitários não substituem isso. Não há garantia de ausência de interrupções. Use o roteiro manual antes de considerar a versão validada.
- Atualização de regras e código é manual. Não há downloads de código ou listas remotas.

## Privacidade e permissões
storage: armazena dois booleanos locais, sem sincronização. declarativeNetRequest: aplica regras declarativas. Correspondências de scripts restritas aos dois sites HTTPS. Sem cookies, histórico, tabs, acesso a arquivos, nativeMessaging, telemetria ou servidores externos. Scripts de conteúdo operam isolados e apenas acrescentam/removem uma folha CSS; não leem mídia ou dados da conta. Nenhum dado pessoal é armazenado ou transmitido pela extensão.

## Testes
Na pasta do projeto execute npm test ou node --test tests/*.test.cjs. Só usa bibliotecas nativas do Node, sem instalações. Testes verificam permissões, escopo das regras, URLs de mídia preservadas, persistência simulada, validação de mensagens, rollback e filtros cosméticos. O motor DNR é simulado; valide sintaxe e comportamento no navegador também. Veja docs/TESTES-MANUAIS.md e docs/RESULTADOS-TESTES.txt.

## Atualização e desinstalação
Antes de atualizar, guarde cópia da pasta. Substitua os arquivos da extensão pela versão revisada, clique Recarregar em edge://extensions (ou chrome://extensions), recarregue os sites e reabra a PWA. Para desinstalar, clique Remover na página de extensões e recarregue os sites; depois exclua a pasta se desejar. Isso remove as regras e preferências locais da extensão e não desinstala o YouTube Music.

## Estrutura
extension/: pacote instalável e código; tests/: testes Node; docs/: diagnóstico, validação e resultados; dist/: pacote ZIP; LICENSE: licença MIT. Sem bibliotecas ou listas de terceiros incorporadas.

## Fontes técnicas
https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest/
https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
https://support.microsoft.com/en-us/edge/apps-and-widgets-that-depend-on-microsoft-edge
https://support.microsoft.com/en-us/edge/add-turn-off-or-remove-extensions-in-microsoft-edge

## Validação após a entrega
O usuário relatou funcionamento em 30/10/2026, sem detalhar os cenários. Consulte docs/VALIDACAO-USUARIO.md. Chrome ainda não foi testado em sessão real.

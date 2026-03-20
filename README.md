# FlowPomo

Pomodoro timer minimalista. Sem distrações.

## Como usar

Abra `index.html` no navegador. Não há dependências, build ou instalação.

## Fluxo

- **25 min** de foco → som de aviso → escolha quando iniciar a pausa
- **5 min** pausa curta (ou **15 min** após 4 sessões) → som de aviso → escolha quando retomar
- A cada fim de sessão de foco, uma citação motivacional aparece na tela

## Funcionalidades

- **Barra de progresso** — depleta em tempo real conforme o ciclo avança
- **Meta diária** — defina quantas sessões quer fazer; barra de progresso separada
- **Streak** — contador de dias consecutivos com sessões completas
- **Modo tarefa** — campo para registrar o que está sendo feito
- **Notificações nativas** — aviso do browser mesmo com a aba em segundo plano
- **Sons configuráveis** — beep, chime ou bell ao fim de cada fase
- **Ambiente sonoro** — ruído branco ou chuva durante o foco (Web Audio API)
- **Player de áudio** — controle de play/pause e volume para a música de fundo (YouTube)
- **Configurações persistidas** — durações, meta e preferências de som salvas no localStorage

## Controles

| botão | ação |
|-------|------|
| iniciar / pausar | inicia ou pausa o timer |
| reset | volta ao estado inicial |
| skip | pula para a próxima fase |
| config | abre painel de configurações |

### Atalhos de teclado

| tecla | ação |
|-------|------|
| `Space` | iniciar / pausar |
| `R` | reset |
| `S` | skip |

## Estrutura

```
flowpomo/
├── index.html   — marcação HTML
├── style.css    — estilos
└── main.js      — lógica
```

## Stack

HTML + CSS + JS puro. Web Audio API para sons. YouTube IFrame API para música de fundo.

---

Desenvolvido por **Jhonnyssom Silva** — 2026

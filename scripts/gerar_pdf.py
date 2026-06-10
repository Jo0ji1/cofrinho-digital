# -*- coding: utf-8 -*-
"""
Gera o PDF de documentação visual/funcional do app Cofry (Cofrinho Digital).
Saída: cofrinho-digital/docs/Cofry_Documentacao.pdf
"""
from __future__ import annotations

import os
from datetime import date
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# ---------------- Paths ----------------
ROOT = Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / "images-telas"
OUT_DIR = ROOT / "docs"
OUT_DIR.mkdir(exist_ok=True)
OUT_PDF = OUT_DIR / "Cofry_Documentacao.pdf"

# ---------------- Cores (paleta do app) ----------------
PRIMARY = colors.HexColor("#10B981")          # verde esmeralda
PRIMARY_DARK = colors.HexColor("#059669")
BG_DARK = colors.HexColor("#0B1220")
SURFACE = colors.HexColor("#111827")
TEXT = colors.HexColor("#0F172A")
TEXT_LIGHT = colors.HexColor("#475569")
ACCENT = colors.HexColor("#1F2937")
BORDER = colors.HexColor("#E5E7EB")
SOFT = colors.HexColor("#F3F4F6")

# ---------------- Telas ----------------
# (arquivo_da_imagem, titulo, subtitulo, [bullets])
SCREENS = [
    (
        "WhatsApp Image 2026-06-10 at 00.23.16.jpeg",
        "1. Tela de Login",
        "Autenticação do usuário",
        [
            "Campos de e-mail e senha com validação antes do envio.",
            "Botão “Esqueci minha senha” → fluxo de recuperação por e-mail (Supabase Auth).",
            "Login social “Entrar com Google” via @react-native-google-signin.",
            "Atalho “Criar conta” leva para a tela de cadastro.",
            "Ícone de olho para mostrar/ocultar a senha digitada.",
        ],
    ),
    (
        "WhatsApp Image 2026-06-10 at 00.23.16 (1).jpeg",
        "2. Início — Dashboard (topo)",
        "Visão geral do objetivo ativo",
        [
            "Saudação personalizada com o nome do usuário e seletor do objetivo ativo (4 objetivos cadastrados no exemplo).",
            "Atalhos rápidos no topo: acesso a objetivos compartilhados e à carteira.",
            "Cartão “Progresso do objetivo”: valor economizado, meta total, percentual atingido e barra de progresso.",
            "Indicadores de prazo: dias restantes até a data-alvo (24/12/2026).",
            "Cartões “Falta” e modalidade ativa (Diária / Semanal / Mensal) com o valor sugerido.",
            "Bloco “Resumo do mês”: total deste mês, mês anterior e variação percentual.",
            "Carrossel de Conquistas (2/9 desbloqueadas): Primeiro Passo, Constante, Sequência de 3, etc.",
        ],
    ),
    (
        "WhatsApp Image 2026-06-10 at 00.23.17 (1).jpeg",
        "3. Início — Dashboard (meio)",
        "Engajamento e gamificação",
        [
            "“Dica do dia”: mensagem motivacional/financeira rotativa com base no dia do ano.",
            "“Desafio da Semana”: valor sugerido para economizar na semana, calculado a partir da modalidade ativa.",
            "Barra de progresso do desafio semanal em tempo real.",
            "“Frequência de economia” — heatmap estilo GitHub mostrando dias ativos nos últimos 3 meses.",
            "Legenda de intensidade (“Menos / Mais”) e contagem de dias ativos no período.",
        ],
    ),
    (
        "WhatsApp Image 2026-06-10 at 00.23.17.jpeg",
        "4. Início — Dashboard (rodapé)",
        "Gráficos e análises",
        [
            "“Evolução das economias”: gráfico de linha (react-native-chart-kit) com o acumulado por registro. Tocar em um ponto mostra detalhes.",
            "“Economias por origem”: ranking das categorias com barras coloridas e total por categoria (Pix, Outro, Desconto obtido, Dinheiro em espécie…).",
            "Cores dinâmicas por categoria. Suporta categorias do banco (Supabase) e fallback local.",
            "Toda a tela respeita o tema claro/escuro escolhido em Ajustes.",
        ],
    ),
    (
        "WhatsApp Image 2026-06-10 at 00.23.17 (2).jpeg",
        "5. Registrar Economia",
        "Lançamento de novas economias",
        [
            "Cabeçalho mostra o objetivo ativo e um aviso de que pode ser trocado no Dashboard.",
            "Atalho “Repetir último registro” preenche valor e origem do último lançamento.",
            "Campo de valor formatado em Real Brasileiro (R$) com máscara de moeda.",
            "Seleção de origem da economia em chips com emoji: Cortei um gasto, Desconto obtido, Dinheiro em espécie, Economizei em compra, Pix recebido, Renda extra, Sobra do salário, Outro.",
            "Campo de descrição opcional para anotar o contexto do registro.",
            "Salva no Supabase (se logado) ou no AsyncStorage local (modo offline).",
        ],
    ),
    (
        "WhatsApp Image 2026-06-10 at 00.23.17 (3).jpeg",
        "6. Histórico",
        "Lista, busca e filtros das economias",
        [
            "Busca por descrição/categoria em tempo real.",
            "Filtros rápidos por período: Tudo / Semana / Mês — com contador de registros.",
            "Filtros por objetivo (chips) para isolar economias de uma meta específica.",
            "Cartão de “Total economizado” somando o filtro ativo.",
            "Cada registro mostra: descrição, data, categoria (badge colorido), objetivo vinculado e valor.",
            "Ações por item: Editar (atualizar valor/descrição) e Excluir (com confirmação).",
            "Em objetivos compartilhados, exibe quem fez o lançamento (badge “Você”).",
        ],
    ),
    (
        "WhatsApp Image 2026-06-10 at 00.23.18.jpeg",
        "7. Ajustes — Perfil e Objetivos",
        "Conta, metas e participação em objetivos",
        [
            "Bloco “Perfil”: nome de usuário, e-mail e botão “Sair da conta” (encerra a sessão do Supabase).",
            "Bloco “Objetivos (4)”: lista de todas as metas com progresso (valor atual / meta e %).",
            "Indicadores visuais: ponto verde = objetivo ativo; ícone de pessoas (2) = objetivo compartilhado; badge “Participante” quando o usuário não é o dono.",
            "Cada objetivo permite Editar (nome, valor, prazo) ou Excluir.",
            "Suporte a objetivos longos (ex.: “Iphone 561 PRO MAX…”) com quebra de linha.",
        ],
    ),
    (
        "WhatsApp Image 2026-06-10 at 00.23.18 (2).jpeg",
        "8. Ajustes — Novo Objetivo, Modalidade e Export",
        "Criação de metas e modalidade ativa",
        [
            "Botão “+ Novo objetivo” → fluxo de onboarding curto para criar uma nova meta.",
            "Bloco “Modalidade”: mostra a modalidade ativa (Diária no exemplo) e botão “Alterar modalidade” (Diária, Semanal Progressivo, Mensal).",
            "Bloco “Exportar dados”: gera um CSV de todas as economias do objetivo atual, pronto para Excel/Sheets.",
            "No mobile o CSV é aberto via expo-sharing; no web é baixado diretamente.",
        ],
    ),
    (
        "WhatsApp Image 2026-06-10 at 00.23.18 (1).jpeg",
        "9. Ajustes — Notificações, Aparência e Dados",
        "Preferências do usuário",
        [
            "“Notificações”: switch para ativar/desativar lembretes diários (mostrados como toast in-app no Expo Go; com EAS Build pode virar push real).",
            "“Aparência”: três opções de tema — Claro, Escuro e Sistema (segue o tema do dispositivo).",
            "“Dados”: exportar todos os dados em CSV ou resetar tudo (com modal de confirmação).",
            "Versão do app exibida no rodapé (Cofry v3.2.0).",
        ],
    ),
]


# ---------------- Estilos ----------------
styles = getSampleStyleSheet()

H1 = ParagraphStyle(
    "H1",
    parent=styles["Heading1"],
    fontName="Helvetica-Bold",
    fontSize=24,
    leading=28,
    textColor=PRIMARY_DARK,
    spaceAfter=6,
)
H2 = ParagraphStyle(
    "H2",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=16,
    leading=20,
    textColor=PRIMARY_DARK,
    spaceBefore=6,
    spaceAfter=4,
)
H3 = ParagraphStyle(
    "H3",
    parent=styles["Heading3"],
    fontName="Helvetica-Bold",
    fontSize=12,
    leading=15,
    textColor=TEXT,
    spaceBefore=2,
    spaceAfter=4,
)
BODY = ParagraphStyle(
    "Body",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=10.5,
    leading=14,
    textColor=TEXT,
    alignment=TA_JUSTIFY,
)
SUB = ParagraphStyle(
    "Sub",
    parent=styles["BodyText"],
    fontName="Helvetica-Oblique",
    fontSize=10,
    leading=13,
    textColor=TEXT_LIGHT,
    spaceAfter=6,
)
BULLET = ParagraphStyle(
    "Bullet",
    parent=BODY,
    fontSize=9.5,
    leftIndent=10,
    bulletIndent=2,
    spaceAfter=2,
)
CAPA_TITULO = ParagraphStyle(
    "CapaT",
    parent=H1,
    fontSize=44,
    leading=52,
    alignment=TA_CENTER,
    textColor=PRIMARY,
)
CAPA_SUB = ParagraphStyle(
    "CapaS",
    parent=BODY,
    fontSize=14,
    leading=20,
    alignment=TA_CENTER,
    textColor=TEXT_LIGHT,
)


# ---------------- Helpers ----------------
def fit_image(path: Path, max_w: float, max_h: float) -> Image:
    """Cria um Image do reportlab preservando proporção."""
    with PILImage.open(path) as im:
        iw, ih = im.size
    ratio = min(max_w / iw, max_h / ih)
    return Image(str(path), width=iw * ratio, height=ih * ratio)


def bullets(items: list[str]) -> list[Paragraph]:
    return [Paragraph(f"• {it}", BULLET) for it in items]


def screen_block(img_file: str, title: str, subtitle: str, items: list[str]) -> KeepTogether:
    """Monta o bloco de uma tela: imagem à esquerda + texto à direita."""
    img_path = IMG_DIR / img_file
    if not img_path.exists():
        raise FileNotFoundError(img_path)

    img = fit_image(img_path, max_w=6.0 * cm, max_h=13.0 * cm)

    right_cells = [Paragraph(title, H2), Paragraph(subtitle, SUB)] + bullets(items)
    right_table = Table([[c] for c in right_cells], colWidths=[9.0 * cm])
    right_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    outer = Table([[img, right_table]], colWidths=[6.5 * cm, 9.0 * cm])
    outer.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("BACKGROUND", (0, 0), (-1, -1), SOFT),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("ROUNDEDCORNERS", [8, 8, 8, 8]),
            ]
        )
    )
    return KeepTogether([outer, Spacer(1, 0.4 * cm)])


# ---------------- Page header / footer ----------------
def on_page(canvas, doc):
    canvas.saveState()
    w, h = A4
    # rodapé
    canvas.setFillColor(TEXT_LIGHT)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(2 * cm, 1.2 * cm, "Cofry — Cofrinho Digital • Documentação Visual e Funcional")
    canvas.drawRightString(w - 2 * cm, 1.2 * cm, f"Página {doc.page}")
    # barra superior fininha verde
    canvas.setFillColor(PRIMARY)
    canvas.rect(0, h - 0.35 * cm, w, 0.35 * cm, stroke=0, fill=1)
    canvas.restoreState()


def on_page_cover(canvas, doc):
    canvas.saveState()
    w, h = A4
    # fundo escuro estilo app
    canvas.setFillColor(BG_DARK)
    canvas.rect(0, 0, w, h, stroke=0, fill=1)
    # faixa verde superior
    canvas.setFillColor(PRIMARY)
    canvas.rect(0, h - 2 * cm, w, 2 * cm, stroke=0, fill=1)
    # faixa verde inferior
    canvas.setFillColor(PRIMARY_DARK)
    canvas.rect(0, 0, w, 1.5 * cm, stroke=0, fill=1)
    canvas.restoreState()


# ---------------- Build ----------------
def build():
    MARGIN_H = 1.5 * cm  # Margem horizontal (reduzida para 1.5cm)
    MARGIN_V = 1.5 * cm  # Margem vertical
    doc = BaseDocTemplate(
        str(OUT_PDF),
        pagesize=A4,
        leftMargin=MARGIN_H,
        rightMargin=MARGIN_H,
        topMargin=MARGIN_V,
        bottomMargin=MARGIN_V,
        title="Cofry — Documentação Visual e Funcional",
        author="Projeto Cofrinho Digital",
    )

    frame_cover = Frame(0, 0, A4[0], A4[1], leftPadding=MARGIN_H, rightPadding=MARGIN_H,
                        topPadding=MARGIN_V, bottomPadding=MARGIN_V, id="cover")
    frame_body = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")

    doc.addPageTemplates([
        PageTemplate(id="Cover", frames=[frame_cover], onPage=on_page_cover),
        PageTemplate(id="Body", frames=[frame_body], onPage=on_page),
    ])

    story = []

    # ---------- CAPA ----------
    story.append(Spacer(1, 4.5 * cm))
    cover_title_style = ParagraphStyle(
        "CT", parent=CAPA_TITULO, textColor=colors.white
    )
    cover_sub_style = ParagraphStyle(
        "CS", parent=CAPA_SUB, textColor=colors.HexColor("#CBD5E1")
    )
    story.append(Paragraph("Cofry", cover_title_style))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Cofrinho Digital", ParagraphStyle(
        "ST", parent=cover_sub_style, fontSize=22, leading=28, textColor=colors.white
    )))
    story.append(Spacer(1, 1.0 * cm))
    story.append(Paragraph("Documentação Visual e Funcional do Sistema", cover_sub_style))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("Aplicativo multiplataforma de controle de economias pessoais", cover_sub_style))
    story.append(Paragraph("React Native • Expo SDK 55 • Supabase", cover_sub_style))
    story.append(Spacer(1, 3.5 * cm))
    story.append(Paragraph("Versão do app: <b>v3.2.0</b>", cover_sub_style))
    story.append(Paragraph(f"Data: {date.today().strftime('%d/%m/%Y')}", cover_sub_style))
    # A partir da próxima página, usar o template "Body" (fundo branco)
    story.append(NextPageTemplate("Body"))
    story.append(PageBreak())

    # ---------- Sumário / Visão geral ----------
    story.append(Paragraph("Sobre o projeto", H1))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "O <b>Cofry — Cofrinho Digital</b> é um aplicativo multiplataforma (Android, iOS e Web) "
        "para o usuário definir metas de economia, registrar quanto poupou e acompanhar a evolução "
        "em gráficos, conquistas e desafios. O app funciona tanto <i>online</i> (sincronizado na "
        "nuvem via Supabase) quanto <i>offline</i> (armazenamento local com AsyncStorage), e suporta "
        "metas compartilhadas entre vários usuários.",
        BODY,
    ))
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph("Principais funcionalidades", H2))
    story.extend(bullets([
        "Autenticação por e-mail/senha e login social com Google (Supabase Auth).",
        "Múltiplos objetivos por usuário, com prazo e valor-meta.",
        "Objetivos compartilhados (vários membros contribuindo na mesma meta).",
        "Registro de economias com valor, descrição, data e categoria de origem.",
        "Modalidades de poupança: Diária, Semanal Progressivo e Mensal.",
        "Dashboard com progresso, falta, valor diário sugerido e resumo do mês.",
        "Gamificação: 9 conquistas, desafio semanal e heatmap de frequência.",
        "Gráfico de evolução das economias e ranking por origem/categoria.",
        "Histórico com busca, filtros por período e por objetivo, edição e exclusão.",
        "Exportação completa em CSV (compartilhamento nativo no mobile / download no web).",
        "Tema claro, escuro ou conforme o sistema; interface 100% em Português (BR).",
        "Lembretes/notificações in-app para incentivar o registro diário.",
    ]))
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph("Stack técnica", H2))
    tech_data = [
        ["Camada", "Tecnologia"],
        ["UI / Mobile", "React Native 0.83 + Expo SDK 55"],
        ["Web", "react-native-web + Expo Router"],
        ["Navegação", "expo-router (file-based)"],
        ["Estado", "React Context (Auth / Data / Theme)"],
        ["Backend", "Supabase (PostgreSQL + Auth + RLS)"],
        ["Offline", "AsyncStorage (fallback local)"],
        ["Gráficos", "react-native-chart-kit + react-native-svg"],
        ["Animações", "react-native-reanimated"],
        ["Auth social", "@react-native-google-signin/google-signin"],
        ["Export / Share", "expo-file-system + expo-sharing"],
        ["Linguagem", "TypeScript 5.3"],
    ]
    tech_table = Table(tech_data, colWidths=[4.0 * cm, 11.5 * cm])
    tech_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
            ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(tech_table)
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph("Fluxo de navegação", H2))
    story.append(Paragraph(
        "Ao abrir, o app verifica a sessão no Supabase. Sem sessão, vai para <b>Login</b> "
        "(com opção de cadastro e recuperação de senha). Com sessão, se for o primeiro acesso "
        "vai para o <b>Onboarding</b> para criar a primeira meta. Depois disso o usuário entra nas "
        "abas principais: <b>Início</b>, <b>Registrar</b>, <b>Histórico</b> e <b>Ajustes</b>.",
        BODY,
    ))
    story.append(PageBreak())

    # ---------- Telas ----------
    story.append(Paragraph("Telas do sistema", H1))
    story.append(Paragraph(
        "A seguir, cada uma das telas principais do Cofry com a descrição das suas funcionalidades.",
        SUB,
    ))
    story.append(Spacer(1, 0.2 * cm))

    for i, (img, title, sub, items) in enumerate(SCREENS):
        story.append(screen_block(img, title, sub, items))
        # Quebra de página a cada 2 telas para não amassar
        if (i + 1) % 2 == 0 and i != len(SCREENS) - 1:
            story.append(PageBreak())

    # ---------- Encerramento ----------
    story.append(PageBreak())
    story.append(Paragraph("Considerações finais", H1))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "O Cofry entrega uma experiência completa de controle de economias pessoais "
        "com foco em <b>gamificação</b>, <b>simplicidade de uso</b> e <b>multi-plataforma</b>. "
        "A arquitetura com Supabase + AsyncStorage permite que o app funcione tanto na nuvem "
        "quanto totalmente offline, e a base em Expo Router facilita a manutenção e o lançamento "
        "para Android, iOS e Web a partir do mesmo código.",
        BODY,
    ))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Possíveis evoluções", H2))
    story.extend(bullets([
        "Push notifications reais via build customizado (EAS Build).",
        "Suporte a múltiplas moedas além do Real (R$).",
        "Importação de extrato bancário (OFX/CSV).",
        "Relatórios mensais em PDF gerados a partir do próprio app.",
        "Modo família com convites por link / QR Code.",
    ]))

    doc.build(story)
    print(f"PDF gerado em: {OUT_PDF}")


if __name__ == "__main__":
    build()

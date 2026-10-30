# Ligar o Gestor de Carcaças à planilha Google

Com isso, o site lê a planilha do Google Sheets e grava nela. Não é mais preciso
baixar, importar e exportar o .xlsx.

- **Do Sheets para o site:** o site busca novidades a cada 30 segundos, quando você
  volta para a aba do navegador e quando clica em **Sincronizar agora**.
- **Do site para o Sheets:** situação, observação e medidas da peça são gravadas na
  hora, na linha certa. As medidas vão para todas as linhas com o mesmo código de peça.
- Números dos clientes, vendedores, marcas etc. são editados no próprio Sheets e
  aparecem no site.

## 1. Colar o script na planilha (uma vez só)

1. Abra a planilha no Google Sheets.
2. Menu **Extensões → Apps Script**.
3. Apague o que estiver no editor, cole todo o conteúdo de `Codigo.gs` e salve (ícone de disquete).
4. No começo do código, troque `TROQUE-ESTA-CHAVE` por uma senha só de vocês.
   Exemplo: `const CHAVE = 'soma-carcacas-2026';`
5. Se a aba de vendas não se chamar **Carcaças**, ajuste a linha `const ABA = 'Carcaças';`.

## 2. Publicar como App da Web

1. No Apps Script, clique em **Implantar → Nova implantação**.
2. Na engrenagem de "Selecione o tipo", escolha **App da Web**.
3. Preencha:
   - **Executar como:** *Eu* (sua conta)
   - **Quem pode acessar:** *Qualquer pessoa*
4. Clique em **Implantar** e autorize com a sua conta Google.
   O Google pode avisar "app não verificado": clique em **Avançado → Acessar (não seguro)**.
   O script é seu e só mexe nesta planilha.
5. Copie o **URL do app da Web** (termina em `/exec`).

## 3. Conectar o site

1. No site, clique em **Planilha Google**.
2. Cole o link `/exec` e a chave do passo 1. Depois clique em **Conectar**.
3. Para a equipe: abra **Planilha Google** de novo, clique em **Copiar** no
   "Link para a equipe" e mande para eles. Quem abrir esse link já entra conectado.
   Trate esse link como uma senha, porque ele leva a chave junto.

## Bom saber

- **Coluna `ID (não editar)`:** o script cria essa coluna no fim da aba, para saber
  qual linha alterar. Não apague nem edite. Se quiser, oculte a coluna.
  Linha nova ou copiada ganha um ID sozinha.
- **Situação:** o site grava exatamente *Pendente*, *Em andamento*, *Concluída* ou
  *Excluída*. Deixe essas quatro opções na lista suspensa da coluna Situação.
- **Dias desde a venda:** o site calcula sozinho a partir da Data e não mexe nessa coluna.
- **Alterou o script depois?** Use **Implantar → Gerenciar implantações → editar (lápis)
  → Versão: Nova versão → Implantar**. Assim o link continua o mesmo.
  Se usar "Nova implantação", o link muda e cada pessoa precisa conectar de novo.
- **Trocou a chave?** Mande o link novo para a equipe.
- **Desconectar:** em **Planilha Google → Desconectar este navegador**. A planilha não é
  alterada, e o site volta a funcionar com arquivo importado.

/**
 * Abre um arquivo protegido em outra aba. A aba é aberta antes do download,
 * ainda no clique, para não ser bloqueada como pop-up.
 */
export async function abrirArquivo(baixar: () => Promise<Blob>) {
  const aba = window.open('', '_blank')
  try {
    const url = URL.createObjectURL(await baixar())
    if (aba) aba.location.href = url
    else window.location.assign(url)
    // Libera a memória depois que a aba carregou o arquivo.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (erro) {
    aba?.close()
    throw erro
  }
}

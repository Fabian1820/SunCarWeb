import { NextRequest, NextResponse } from "next/server"

const REPOS = {
  frontend: { owner: "Fabian1820", repo: "SunCarWeb", base: "main", head: "dev" },
  backend: { owner: "Ruben0304", repo: "SunCarBackend", base: "master", head: "dev" },
} as const

type RepoKey = keyof typeof REPOS

export async function POST(request: NextRequest) {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return NextResponse.json({ success: false, message: "GITHUB_TOKEN no configurado" }, { status: 500 })
  }

  let target: RepoKey
  try {
    const body = await request.json()
    target = body.target
  } catch {
    return NextResponse.json({ success: false, message: "Body inválido" }, { status: 400 })
  }

  if (!target || !(target in REPOS)) {
    return NextResponse.json({ success: false, message: "target debe ser 'frontend' o 'backend'" }, { status: 400 })
  }

  const { owner, repo, base, head } = REPOS[target]

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/merges`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base,
      head,
      commit_message: `chore: merge ${head} → ${base}`,
    }),
  })

  // 201 = merge creado, 204 = nada nuevo que mergear
  if (res.status === 201) {
    const data = await res.json()
    return NextResponse.json({
      success: true,
      message: `✅ Merge completado: ${head} → ${base} en ${repo}`,
      sha: data.sha,
    })
  }

  if (res.status === 204) {
    return NextResponse.json({
      success: true,
      message: `ℹ️ Ya estaba al día: ${head} → ${base} en ${repo}`,
    })
  }

  const errorData = await res.json().catch(() => ({}))
  return NextResponse.json(
    {
      success: false,
      message: errorData.message || `Error GitHub: ${res.status}`,
    },
    { status: res.status }
  )
}

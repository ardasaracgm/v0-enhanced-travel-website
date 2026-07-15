import { notFound } from 'next/navigation'

import { requireFullAdmin } from '@/lib/auth/require-admin'
import { listAdminUsers } from '@/lib/admin/list-admins'
import { setAdminRole, setAdminDisabled } from '@/lib/actions/admin-set-user-role'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // full-admin only — cars_only URL'i elle yazsa da 404 (nav filtresine çift savunma).
  const gate = await requireFullAdmin()
  if (!gate.ok) notFound()

  const users = await listAdminUsers()
  const btn = 'h-8 rounded-md border px-3 text-xs font-medium'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active admins and their role. Full admins can change roles or disable access.
        </p>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="whitespace-nowrap">Since</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No admins.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isSelf = u.id === gate.userId
                const isFull = u.admin_role === 'full'
                return (
                  <TableRow key={u.id}>
                    <TableCell className="text-foreground">
                      {u.email}
                      {isSelf ? (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={isFull ? 'default' : 'secondary'}>{u.admin_role}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Self için demote/disable butonları disabled (action da ayrıca reddeder). */}
                      <div className="flex justify-end gap-2">
                        {isFull ? (
                          <form action={setAdminRole}>
                            <input type="hidden" name="targetId" value={u.id} />
                            <input type="hidden" name="role" value="cars_only" />
                            <input type="hidden" name="locale" value={locale} />
                            <button
                              type="submit"
                              disabled={isSelf}
                              className={`${btn} disabled:opacity-40`}
                            >
                              → cars_only
                            </button>
                          </form>
                        ) : (
                          <form action={setAdminRole}>
                            <input type="hidden" name="targetId" value={u.id} />
                            <input type="hidden" name="role" value="full" />
                            <input type="hidden" name="locale" value={locale} />
                            <button type="submit" className={btn}>
                              → full
                            </button>
                          </form>
                        )}
                        <form action={setAdminDisabled}>
                          <input type="hidden" name="targetId" value={u.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            disabled={isSelf}
                            className={`${btn} text-destructive disabled:opacity-40`}
                          >
                            Disable
                          </button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

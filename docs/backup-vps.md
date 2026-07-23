# Backup da VPS

Esta rotina protege as duas fontes de dados persistentes da loja:

- banco MariaDB;
- arquivos em `storage/uploads`.

O arquivo `.env` nao e incluido no pacote. Guarde uma copia dele em um cofre
de senhas ou armazenamento criptografado separado.

## Configuracao

As variaveis podem ser adicionadas ao `/home/loja/.env`:

```dotenv
BACKUP_ROOT="/var/backups/zenv-store"
BACKUP_RETENTION_DAYS="14"
BACKUP_UPLOADS_DIR="/home/loja/storage/uploads"
```

O script reutiliza `MARIADB_HOST`, `MARIADB_PORT`, `MARIADB_DATABASE`,
`MARIADB_USER` e `MARIADB_PASSWORD` do mesmo arquivo.

## Primeiro backup

```bash
cd /home/loja
chmod +x scripts/backup-vps.sh scripts/verify-backup.sh
./scripts/backup-vps.sh
./scripts/verify-backup.sh latest
```

Cada execucao cria um diretorio como:

```text
/var/backups/zenv-store/20260723T030000Z/
  database.sql.gz
  uploads.tar.gz
  manifest.txt
  SHA256SUMS
```

## Agendamento diario

Edite o cron do usuario `root`:

```bash
crontab -e
```

Adicione uma execucao diaria as 03:15, com log:

```cron
15 3 * * * cd /home/loja && /home/loja/scripts/backup-vps.sh >> /var/log/zenv-store-backup.log 2>&1
```

Valide:

```bash
crontab -l
tail -n 100 /var/log/zenv-store-backup.log
```

## Copia externa

O backup local protege contra erro de aplicacao, mas nao contra perda da VPS.
Depois de validar a rotina local, sincronize `BACKUP_ROOT` para um destino
externo com credenciais exclusivas e permissao apenas para gravar backups.

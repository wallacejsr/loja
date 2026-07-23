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
BACKUP_REMOTE_ROOT="gdrive-crypt:ZenvStoreBackups"
```

O script reutiliza `MARIADB_HOST`, `MARIADB_PORT`, `MARIADB_DATABASE`,
`MARIADB_USER` e `MARIADB_PASSWORD` do mesmo arquivo.

`BACKUP_REMOTE_ROOT` e opcional. Quando configurado, o script exige `rclone`,
envia somente o backup recem-criado e executa `rclone check` antes de informar
sucesso. Uma falha externa nao remove a copia local.

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

## Copia externa criptografada

Crie um remote `crypt` sobre uma pasta exclusiva do Google Drive:

```bash
rclone config
```

Use:

```text
name: gdrive-crypt
storage: crypt
remote: gdrive:ZenvStoreBackupsEncrypted
filename_encryption: standard
directory_name_encryption: true
password: gerar uma senha forte
password2: gerar uma segunda senha forte
```

Guarde as duas senhas fora da VPS. Sem elas, o backup remoto nao pode ser
restaurado.

Teste o remote:

```bash
printf 'backup criptografado\n' | rclone rcat gdrive-crypt:teste.txt
rclone cat gdrive-crypt:teste.txt
rclone deletefile gdrive-crypt:teste.txt
```

Depois adicione ao `/home/loja/.env`:

```dotenv
BACKUP_REMOTE_ROOT="gdrive-crypt:ZenvStoreBackups"
```

Execute e valide:

```bash
cd /home/loja
./scripts/backup-vps.sh
rclone lsd gdrive-crypt:ZenvStoreBackups
tail -n 100 /var/log/zenv-store-backup.log
```

No Google Drive, os nomes e o conteudo armazenados na pasta
`ZenvStoreBackupsEncrypted` aparecerao cifrados.

# Auth Nest

API de autentificare pentru aplicații web, construit pe **sesiuni server-side** (nu JWT), cu
NestJS 11, Prisma 7, PostgreSQL și Redis.

Oferă tot ce are nevoie un frontend pentru contul unui utilizator: înregistrare, autentificare,
confirmarea adresei de email prin cod OTP, resetarea parolei, profil cu avatar și gestionarea
dispozitivelor de pe care utilizatorul este conectat.

---

## Cuprins

- [De ce sesiuni și nu JWT](#de-ce-sesiuni-și-nu-jwt)
- [Stack](#stack)
- [Arhitectură](#arhitectură)
- [Pornire rapidă](#pornire-rapidă)
- [Configurație](#configurație)
- [Endpoint-uri](#endpoint-uri)
- [Formatul răspunsurilor](#formatul-răspunsurilor)
- [Măsuri de securitate](#măsuri-de-securitate)
- [Testare](#testare)
- [Docker](#docker)
- [Comenzi disponibile](#comenzi-disponibile)
- [Cum adaugi funcționalități noi](#cum-adaugi-funcționalități-noi)

---

## De ce sesiuni și nu JWT

Un JWT nu poate fi retras înainte de expirare. O sesiune stocată în Redis poate: ștergi cheia și
utilizatorul este deconectat instantaneu. Asta face posibile trei lucruri pe care proiectul le
folosește direct:

- deconectarea unui singur dispozitiv, la cererea utilizatorului;
- închiderea tuturor sesiunilor la schimbarea parolei;
- revocarea imediată a accesului când un cont este șters sau suspendat.

Costul este o citire din Redis per request — acceptabil, având în vedere că oricum citim
utilizatorul din baza de date pentru a reflecta imediat schimbările de cont.

## Stack

| Componentă        | Tehnologie                                     |
| ----------------- | ---------------------------------------------- |
| Framework         | NestJS 11 (Express)                            |
| Bază de date      | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`)   |
| Sesiuni           | Redis + `express-session` / `connect-redis`    |
| Parole            | bcrypt                                         |
| Email             | Nodemailer + template-uri Handlebars           |
| Imagini           | sharp (conversie WebP) + Cloudinary            |
| Validare          | class-validator / class-transformer            |
| Documentație      | OpenAPI (Swagger)                              |
| Rate limiting     | `@nestjs/throttler`                            |
| Health checks     | `@nestjs/terminus`                             |

## Arhitectură

```
src/
├── main.ts                  # punct de intrare (5 linii)
├── app.module.ts            # compunerea modulelor + providerii globali
├── bootstrap/               # middleware, versionare, sesiuni, Swagger
├── config/                  # contractul de mediu + namespace-uri tipizate
├── common/                  # infrastructură transversală, fără logică de domeniu
│   ├── decorators/          # @Auth, @CurrentUser, @SkipResponseTransform
│   ├── exceptions/          # filtre care uniformizează erorile
│   ├── guards/              # AuthGuard
│   ├── interceptors/        # envelope-ul răspunsurilor
│   └── utils/
└── modules/
    ├── auth/                # register, login, logout, OTP, resetare parolă
    ├── session/             # ciclul de viață al sesiunilor + API dispozitive
    ├── users/               # cont, profil, avatar
    ├── prisma/              # client, schema, migrări
    ├── redis/               # conexiunea Redis
    ├── hash/  mailer/  file/  cloudinary/
    └── health/              # sonde pentru orchestratoare
```

Fiecare modul de domeniu respectă aceeași stratificare:

```
Controller  →  Service          →  Repository       →  Prisma / Redis
(HTTP)         (reguli business)   (persistență)
```

Câteva convenții care merită știute înainte de a scrie cod nou:

- **Controllerele nu conțin logică.** Traduc HTTP în apeluri de serviciu și mapează rezultatul
  într-un DTO. Nici măcar sesiunea nu e manipulată direct — asta face `SessionService`.
- **Serviciile nu ating direct Prisma.** Trec prin repository, ceea ce le face testabile fără
  bază de date și izolează schimbările de schemă într-un singur fișier.
- **Configurația nu se citește din `process.env`.** Se injectează namespace-uri tipizate
  (`@Inject(sessionConfig.KEY)`), validate o singură dată la pornire.
- **Entitățile Prisma nu ies din API.** `UserMapper` produce DTO-uri publice, așa că un câmp
  nou în schema (de exemplu un hash) nu se scurge accidental în răspuns.
- **Mesajele pentru utilizator** stau în `private static readonly MESSAGES` pe clasa care le
  folosește, nu împrăștiate prin cod.

## Pornire rapidă

### Cu Docker (recomandat)

```bash
cp .env.example .env          # completează secretele
npm run docker:up             # postgres + redis + migrări + API
npm run docker:logs
```

API-ul răspunde pe `http://localhost:5000/api/v1`, documentația pe `http://localhost:5000/docs`.

### Local, cu infrastructura în Docker

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

> Dacă o variabilă lipsește sau e invalidă, aplicația **nu pornește** și listează toate
> problemele găsite. Este intenționat: o configurație greșită descoperită la pornire e mult mai
> ieftină decât una descoperită în producție.

## Configurație

Contractul complet este `src/config/environment-variables.ts`, iar `.env.example` documentează
fiecare variabilă. Variabilele sunt normalizate (`"8080"` → `8080`, `"false"` → `false`,
`"a.com,b.com"` → listă) și validate la pornire.

Obligatorii, fără valori implicite:

| Variabilă        | Observații                                        |
| ---------------- | ------------------------------------------------- |
| `DATABASE_URL`   | Conexiunea PostgreSQL                             |
| `REDIS_HOST`     | Gazda Redis                                       |
| `COOKIE_SECRET`  | Minim 32 caractere — `openssl rand -base64 32`    |
| `SESSION_SECRET` | Minim 32 caractere, diferit de `COOKIE_SECRET`    |

Configurația e împărțită în namespace-uri (`app`, `session`, `redis`, `mail`, `token`, `upload`,
`throttle`, `security`, `database`, `cloudinary`), fiecare injectabil separat:

```ts
constructor(
  @Inject(sessionConfig.KEY) private readonly config: ConfigType<typeof sessionConfig>,
) {}
```

### Înainte de producție

- `NODE_ENV=production`
- `SESSION_SECURE=true` (cookie trimis doar pe HTTPS)
- `TRUST_PROXY=true` dacă rulezi în spatele unui reverse proxy
- `SWAGGER_ENABLED` lăsat pe `false` dacă documentația nu trebuie publică
- secrete generate separat pentru fiecare mediu

## Endpoint-uri

Toate rutele sunt prefixate cu `/api/v1` (configurabil prin `API_PREFIX` / `API_VERSION`).

### `auth`

| Metodă | Rută                         | Sesiune | Descriere                                          |
| ------ | ---------------------------- | :-----: | -------------------------------------------------- |
| POST   | `/auth/register`             |    –    | Creează contul și pornește sesiunea                |
| POST   | `/auth/login`                |    –    | Autentificare cu email și parolă                   |
| POST   | `/auth/logout`               |    da   | Închide sesiunea curentă                           |
| GET    | `/auth/me`                   |    da   | Contul curent, cu profilul nested                  |
| POST   | `/auth/email/verify/send`    |    da   | Trimite codul de confirmare pe email               |
| POST   | `/auth/email/verify/confirm` |    da   | Confirmă emailul cu codul primit                   |
| POST   | `/auth/password/forgot`      |    –    | Cere codul de resetare                             |
| POST   | `/auth/password/reset`       |    –    | Schimbă parola și închide toate sesiunile          |

### `sessions`

| Metodă | Rută                | Sesiune | Descriere                                   |
| ------ | ------------------- | :-----: | ------------------------------------------- |
| GET    | `/sessions`         |    da   | Dispozitivele conectate, cu `isCurrent`     |
| DELETE | `/sessions/others`  |    da   | Deconectează celelalte dispozitive          |
| DELETE | `/sessions/:id`     |    da   | Revocă o sesiune anume                      |

`id` este un identificator public derivat prin HMAC din session ID. Session ID-ul real nu
părăsește niciodată serverul, pentru că el însuși este o credențială.

### `users`

| Metodă | Rută                 | Sesiune | Descriere                                  |
| ------ | -------------------- | :-----: | ------------------------------------------ |
| POST   | `/users/me/avatar`   |    da   | Încarcă avatarul (`multipart/form-data`)   |
| DELETE | `/users/me/avatar`   |    da   | Șterge avatarul                            |
| PATCH  | `/users/me/profile`  |    da   | Actualizează profilul                      |

### `health`

| Metodă | Rută            | Descriere                                          |
| ------ | --------------- | -------------------------------------------------- |
| GET    | `/health`       | Readiness — verifică PostgreSQL și Redis           |
| GET    | `/health/live`  | Liveness — doar procesul, fără dependențe          |

## Formatul răspunsurilor

Succes:

```json
{
  "success": true,
  "statusCode": 200,
  "meta": { "path": "/api/v1/auth/login", "timestamp": "2026-09-18T06:00:00.000Z" },
  "data": { "user": { "id": "…", "email": "…", "isVerified": false, "profile": null } }
}
```

Eroare — `message` e gata de afișat global, `details` conține erorile pe câmp:

```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation failed",
  "details": { "password": ["Parola trebuie să aibă minim 8 caractere"] },
  "meta": { "path": "/api/v1/auth/register", "timestamp": "2026-09-18T06:00:00.000Z" }
}
```

Singurele excepții sunt sondele de `/health`, care păstrează formatul Terminus pentru că așa îl
așteaptă uneltele care le citesc.

## Măsuri de securitate

| Risc                              | Cum e tratat                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Session fixation                  | Sesiunea e regenerată la fiecare autentificare                               |
| Furt de cookie                    | `httpOnly`, `sameSite`, `secure` în producție, cookie semnat                 |
| Enumerarea conturilor             | Răspunsuri și durate identice pentru email existent / inexistent             |
| Timing attack la login            | Parola e comparată cu un hash-fantomă și când emailul nu există              |
| Coduri OTP din dump de DB         | În baza de date se salvează doar HMAC-ul codului                             |
| Ghicirea codurilor OTP            | Comparație constant-time, maxim `TOKEN_MAX_ATTEMPTS` încercări, apoi invalid |
| Brute force                       | Rate limiting global + limite mai strânse pe endpoint-urile sensibile        |
| Parolă compromisă                 | Resetarea parolei închide toate sesiunile active                             |
| Session ID expus prin API         | Listarea folosește identificatori publici derivați prin HMAC                 |
| Header-e lipsă / payload mare     | `helmet`, `compression`, limită de dimensiune la upload                      |
| Date sensibile în răspuns         | Entitățile trec obligatoriu prin mapper înainte de a fi returnate            |
| Câmpuri neașteptate în body       | `whitelist` + `forbidNonWhitelisted` în `ValidationPipe`                     |

## Testare

```bash
npm test              # teste unitare
npm run test:cov      # cu raport de acoperire
npm run verify        # typecheck + lint + teste (util în CI)
```

Testele unitare rulează fără PostgreSQL sau Redis: repository-urile sunt înlocuite cu mock-uri,
iar Redis are o implementare in-memory în `session.repository.spec.ts`.

Testul end-to-end pornește aplicația reală (aceeași compunere ca în producție) și are nevoie de
infrastructură:

```bash
docker compose up -d postgres redis
npm run prisma:deploy
npm run test:e2e
```

## Docker

Două moduri: **development** (`nest start --watch`, sursele montate) și **production** (imagine compilată).

### Development

```bash
npm run docker:dev
```

`docker-compose.dev.yml` pornește etapa `dev` din Dockerfile. `src/` e montat din gazdă, deci schimbările recompilează API-ul fără rebuild de imagine. PostgreSQL, Redis și migrările rămân ca în compose-ul de bază.

### Production

```bash
cp .env.example .env          # completează secretele
npm run docker:up
npm run docker:logs
```

`Dockerfile` este multi-stage și produce o imagine de runtime fără dependențe de build:

| Etapă          | Rol                                                            |
| -------------- | -------------------------------------------------------------- |
| `deps`         | `npm ci` cu toate dependențele                                 |
| `dev`          | `prisma generate` + `nest start --watch` (doar cu `docker:dev`) |
| `build`        | `prisma generate` + `nest build`                               |
| `runtime-deps` | `npm ci --omit=dev` + clientul Prisma                          |
| `runtime`      | doar `dist/`, `node_modules` de producție, schema și migrările  |

Imaginea de producție rulează ca utilizator neprivilegiat, folosește `dumb-init` ca PID 1 (semnalele ajung la
Node, deci shutdown-ul e curat) și expune un `HEALTHCHECK` care lovește `/api/v1/health`.

`docker-compose.yml` pornește PostgreSQL, Redis, un serviciu one-shot care aplică migrările și
abia apoi API-ul — cu `depends_on: service_healthy`, ca ordinea să fie garantată.

## Comenzi disponibile

| Comandă                   | Descriere                                  |
| ------------------------- | ------------------------------------------ |
| `npm run start:dev`       | Server de dezvoltare cu watch              |
| `npm run build`           | Compilare pentru producție                 |
| `npm run start:prod`      | Rulează build-ul compilat                  |
| `npm run typecheck`       | Verificare de tipuri, fără emit            |
| `npm run lint`            | ESLint cu `--fix`                          |
| `npm run verify`          | typecheck + lint + teste                   |
| `npm run prisma:migrate`  | Creează și aplică o migrare (development)  |
| `npm run prisma:deploy`   | Aplică migrările (producție)               |
| `npm run prisma:studio`   | Interfața Prisma Studio                    |
| `npm run docker:up`       | Ridică tot stack-ul (producție)            |
| `npm run docker:dev`      | Ridică tot stack-ul cu API în watch        |
| `npm run docker:down`     | Oprește stack-ul Docker                    |

## Cum adaugi funcționalități noi

Un modul nou de domeniu urmează pașii:

1. `src/modules/<domeniu>/` cu `*.module.ts`, `*.controller.ts`, `*.service.ts`,
   `*.repository.ts` și `dto/`.
2. Dacă are nevoie de configurație, adaugă variabilele în `EnvironmentVariables`, creează un
   namespace în `src/config/` și înregistrează-l în `configurations`.
3. Protejează rutele cu `@Auth()` — decoratorul adaugă și schema de cookie și răspunsul 401 în
   OpenAPI, deci documentația nu se poate desincroniza de protecția reală.
4. Documentează răspunsul cu `@ApiSuccessResponse(DtoDeDate)`, care descrie envelope-ul complet.
5. Scrie testele lângă cod (`*.spec.ts`), cu repository-ul înlocuit de un mock.

Câteva extinderi pentru care structura e deja pregătită:

- **OAuth / social login** — un serviciu nou în `auth`, care la final apelează
  `SessionService.start()`; restul fluxului rămâne neschimbat.
- **2FA** — `TokenService` emite deja coduri OTP hash-uite, cu limită de încercări.
- **Roluri și permisiuni** — un `RolesGuard` lângă `AuthGuard`, care citește `request.user`.
- **Versiune nouă de API** — `enableVersioning` e deja activ; un controller cu
  `@Controller({ path: 'auth', version: '2' })` coexistă cu v1.

## Licență

MIT

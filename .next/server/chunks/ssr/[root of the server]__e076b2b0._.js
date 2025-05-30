module.exports = {

"[externals]/fs [external] (fs, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}}),
"[externals]/os [external] (os, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}}),
"[externals]/crypto [external] (crypto, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}}),
"[externals]/pg [external] (pg, esm_import)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, a: __turbopack_async_module__ } = __turbopack_context__;
__turbopack_async_module__(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
const mod = await __turbopack_context__.y("pg");

__turbopack_context__.n(mod);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[externals]/better-sqlite3 [external] (better-sqlite3, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("better-sqlite3", () => require("better-sqlite3"));

module.exports = mod;
}}),
"[project]/src/db/db.config.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "dbTable": (()=>dbTable),
    "integer": (()=>integer),
    "primaryKey": (()=>primaryKey),
    "text": (()=>text),
    "timestamp": (()=>timestamp)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/integer.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$primary$2d$keys$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/primary-keys.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sqlite$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sqlite-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sqlite$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sqlite-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sqlite$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sqlite-core/columns/integer.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sqlite$2d$core$2f$primary$2d$keys$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sqlite-core/primary-keys.js [app-rsc] (ecmascript)");
;
;
const dbType = process.env.DB_TYPE || 'postgres';
const dbTable = (name, columns, config)=>{
    if (dbType === 'sqlite') {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sqlite$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sqliteTable"])(name, columns, config);
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])(name, columns, config);
};
const text = (name, p0)=>dbType === 'sqlite' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sqlite$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])(name) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])(name);
const integer = (name)=>dbType === 'sqlite' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sqlite$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])() : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])(name);
const primaryKey = dbType === 'sqlite' ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sqlite$2d$core$2f$primary$2d$keys$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["primaryKey"] : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$primary$2d$keys$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["primaryKey"];
const timestamp = (name, p0)=>dbType === 'sqlite' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sqlite$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])() : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])(name);
}}),
"[project]/src/db/schemas/practicesSchema.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "practices": (()=>practices),
    "practicesRelations": (()=>practicesRelations)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/db.config.ts [app-rsc] (ecmascript)"); // Removed primaryKey as it's not used here
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$relations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/relations.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/usersSchema.ts [app-rsc] (ecmascript)");
;
;
;
;
const isSqlite = process.env.DB_TYPE === 'sqlite';
const practices = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["dbTable"])('practices', {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('id').primaryKey().$defaultFn(()=>crypto.randomUUID()),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('name').notNull(),
    createdAt: isSqlite ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('createdAt', {
        mode: 'timestamp_ms'
    }).notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('createdAt', {
        mode: 'date'
    }).default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: isSqlite ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('updatedAt', {
        mode: 'timestamp_ms'
    }).notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`).$onUpdate(()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('updatedAt', {
        mode: 'date'
    }).default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`).notNull()
});
const practicesRelations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$relations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["relations"])(practices, ({ many })=>({
        usersPractice: many(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"], {
            relationName: 'usersPracticeRelation'
        }),
        usersCurrentPractice: many(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"], {
            relationName: 'usersCurrentPracticeRelation'
        }),
        accessibleToAdmins: many(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePractices"])
    }));
}}),
"[project]/src/db/schemas/sessionsSchema.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
// sessionsSchema.ts
__turbopack_context__.s({
    "sessions": (()=>sessions),
    "sessionsRelations": (()=>sessionsRelations)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/db.config.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$relations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/relations.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/usersSchema.ts [app-rsc] (ecmascript)");
;
;
;
const isSqlite = process.env.DB_TYPE === 'sqlite';
const sessions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["dbTable"])('sessions', {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('id').primaryKey().$defaultFn(()=>crypto.randomUUID()),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('user_id').notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"].id, {
        onDelete: 'cascade'
    }),
    // For SQLite, timestamp (which is integer) can store Unix epoch seconds or milliseconds.
    // For PG, timestamp with mode: 'date' and withTimezone: true is more appropriate.
    expiresAt: isSqlite ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('expiresAt', {
        mode: 'timestamp_ms'
    }).notNull() // Drizzle uses integer for SQLite timestamps
     : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('expiresAt').notNull(),
    data: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('data'),
    createdAt: isSqlite ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('createdAt', {
        mode: 'timestamp_ms'
    }).notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('createdAt', {
        mode: 'date'
    }).notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`)
});
const sessionsRelations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$relations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["relations"])(sessions, ({ one })=>({
        user: one(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"], {
            fields: [
                sessions.userId
            ],
            references: [
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"].id
            ]
        })
    }));
}}),
"[project]/src/db/schemas/usersSchema.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
// schema/usersSchema.ts
__turbopack_context__.s({
    "administratorAccessiblePractices": (()=>administratorAccessiblePractices),
    "administratorAccessiblePracticesRelations": (()=>administratorAccessiblePracticesRelations),
    "userRoleEnum": (()=>userRoleEnum),
    "users": (()=>users),
    "usersRelations": (()=>usersRelations)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/db.config.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$relations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/relations.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/practicesSchema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$sessionsSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/sessionsSchema.ts [app-rsc] (ecmascript)");
;
;
;
;
const isSqlite = process.env.DB_TYPE === 'sqlite';
const userRoleEnum = [
    'CLIENT',
    'PRACTICE_ADMINISTRATOR',
    'ADMINISTRATOR'
];
const users = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["dbTable"])('users', {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('id').primaryKey().$defaultFn(()=>crypto.randomUUID()),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('email').notNull().unique(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('name'),
    password: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('password').notNull(),
    role: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('role', {
        enum: userRoleEnum
    }).notNull(),
    practiceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('practice_id').references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["practices"].id, {
        onDelete: 'set null'
    }),
    currentPracticeId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('current_practice_id').references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["practices"].id, {
        onDelete: 'set null'
    }),
    createdAt: isSqlite ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('createdAt', {
        mode: 'timestamp_ms'
    }).notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('createdAt', {
        mode: 'date'
    }).default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: isSqlite ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('updatedAt', {
        mode: 'timestamp_ms'
    }).notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`).$onUpdate(()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('createdAt', {
        mode: 'date'
    }).default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`).notNull()
});
const administratorAccessiblePractices = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["dbTable"])('administrator_accessible_practices', {
    administratorId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('administrator_id').notNull().references(()=>users.id, {
        onDelete: 'cascade'
    }),
    practiceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])('practice_id').notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["practices"].id, {
        onDelete: 'cascade'
    }),
    assignedAt: isSqlite ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('assignedAt', {
        mode: 'timestamp_ms'
    }).notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('assignedAt', {
        mode: 'date'
    }).notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`),
    createdAt: isSqlite ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('createdAt', {
        mode: 'timestamp_ms'
    }).notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('createdAt', {
        mode: 'date'
    }).notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`),
    updatedAt: isSqlite ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('updatedAt', {
        mode: 'timestamp_ms'
    }).notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`).$onUpdate(()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])('updatedAt', {
        mode: 'date'
    }).notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`)
}, (table)=>({
        pk: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$db$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["primaryKey"])({
            columns: [
                table.administratorId,
                table.practiceId
            ]
        })
    }));
const usersRelations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$relations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["relations"])(users, ({ one, many })=>({
        assignedPractice: one(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["practices"], {
            fields: [
                users.practiceId
            ],
            references: [
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["practices"].id
            ],
            relationName: 'usersPracticeRelation'
        }),
        currentSelectedPractice: one(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["practices"], {
            fields: [
                users.currentPracticeId
            ],
            references: [
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["practices"].id
            ],
            relationName: 'usersCurrentPracticeRelation'
        }),
        accessiblePractices: many(administratorAccessiblePractices),
        sessions: many(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$sessionsSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sessions"])
    }));
const administratorAccessiblePracticesRelations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$relations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["relations"])(administratorAccessiblePractices, ({ one })=>({
        administrator: one(users, {
            fields: [
                administratorAccessiblePractices.administratorId
            ],
            references: [
                users.id
            ]
        }),
        practice: one(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["practices"], {
            fields: [
                administratorAccessiblePractices.practiceId
            ],
            references: [
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["practices"].id
            ]
        })
    }));
}}),
"[project]/src/db/schema.ts [app-rsc] (ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "schema": (()=>schema)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/usersSchema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/practicesSchema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$sessionsSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/sessionsSchema.ts [app-rsc] (ecmascript)");
;
;
;
const schema = {
    users: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"],
    practices: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["practices"],
    sessions: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$sessionsSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sessions"],
    administratorAccessiblePractices: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePractices"]
};
;
;
;
}}),
"[project]/src/db/schema.ts [app-rsc] (ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/usersSchema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/practicesSchema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$sessionsSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/sessionsSchema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript) <locals>");
}}),
"[project]/src/db/schema.ts [app-rsc] (ecmascript) <exports>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "administratorAccessiblePractices": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePractices"]),
    "administratorAccessiblePracticesRelations": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePracticesRelations"]),
    "practices": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["practices"]),
    "practicesRelations": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["practicesRelations"]),
    "schema": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["schema"]),
    "sessions": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$sessionsSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sessions"]),
    "sessionsRelations": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$sessionsSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sessionsRelations"]),
    "userRoleEnum": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["userRoleEnum"]),
    "users": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"]),
    "usersRelations": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["usersRelations"])
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$practicesSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/practicesSchema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$sessionsSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/sessionsSchema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/usersSchema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript) <locals>");
}}),
"[project]/src/db/schema.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "administratorAccessiblePractices": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$exports$3e$__["administratorAccessiblePractices"]),
    "administratorAccessiblePracticesRelations": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$exports$3e$__["administratorAccessiblePracticesRelations"]),
    "practices": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$exports$3e$__["practices"]),
    "practicesRelations": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$exports$3e$__["practicesRelations"]),
    "schema": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$exports$3e$__["schema"]),
    "sessions": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$exports$3e$__["sessions"]),
    "sessionsRelations": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$exports$3e$__["sessionsRelations"]),
    "userRoleEnum": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$exports$3e$__["userRoleEnum"]),
    "users": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$exports$3e$__["users"]),
    "usersRelations": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$exports$3e$__["usersRelations"])
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$exports$3e$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript) <exports>");
}}),
"[project]/src/db/index.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, a: __turbopack_async_module__ } = __turbopack_context__;
__turbopack_async_module__(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s({
    "db": (()=>db)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dotenv$2f$lib$2f$main$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/dotenv/lib/main.js [app-rsc] (ecmascript)");
// index.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/node-postgres/driver.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$better$2d$sqlite3$2f$driver$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/better-sqlite3/driver.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$29$__ = __turbopack_context__.i("[externals]/pg [external] (pg, esm_import)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$better$2d$sqlite3__$5b$external$5d$__$28$better$2d$sqlite3$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/better-sqlite3 [external] (better-sqlite3, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$29$__
]);
([__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__);
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$dotenv$2f$lib$2f$main$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["config"])(); // Load environment variables at the very top
;
;
;
;
;
let dbInstance;
const dbType = process.env.DB_TYPE || 'postgres'; // Default to PostgreSQL
console.log(`[DB_INIT] DB_TYPE set to: ${dbType}`);
if (dbType === 'postgres') {
    if (!process.env.POSTGRES_URL) {
        throw new Error('POSTGRES_URL environment variable is not set for DB_TYPE="postgres".');
    }
    console.log('🔌 Connecting to PostgreSQL database...');
    let poolClient;
    if ("TURBOPACK compile-time falsy", 0) {
        "TURBOPACK unreachable";
    } else {
        if (!global.DrizzlePostgresClient) {
            global.DrizzlePostgresClient = new __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$29$__["Pool"]({
                connectionString: process.env.POSTGRES_URL
            });
            console.log('[DB_INIT] New PostgreSQL global client created for development.');
        } else {
            console.log('[DB_INIT] Reusing existing PostgreSQL global client for development.');
        }
        poolClient = global.DrizzlePostgresClient;
    }
    dbInstance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["drizzle"])(poolClient, {
        schema: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
        logger: ("TURBOPACK compile-time value", "development") === 'development'
    });
    console.log('✅ PostgreSQL Drizzle instance created.');
} else if (dbType === 'sqlite') {
    if (!process.env.SQLITE_DB_PATH) {
        throw new Error('SQLITE_DB_PATH environment variable is not set for DB_TYPE="sqlite".');
    }
    console.log(`🔌 Connecting to SQLite database at: ${process.env.SQLITE_DB_PATH}`);
    let sqliteClient;
    if ("TURBOPACK compile-time falsy", 0) {
        "TURBOPACK unreachable";
    } else {
        if (!global.DrizzleSqliteClient) {
            global.DrizzleSqliteClient = new __TURBOPACK__imported__module__$5b$externals$5d2f$better$2d$sqlite3__$5b$external$5d$__$28$better$2d$sqlite3$2c$__cjs$29$__["default"](process.env.SQLITE_DB_PATH);
            console.log('[DB_INIT] New SQLite global client created for development.');
        } else {
            console.log('[DB_INIT] Reusing existing SQLite global client for development.');
        }
        sqliteClient = global.DrizzleSqliteClient;
    }
    dbInstance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$better$2d$sqlite3$2f$driver$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["drizzle"])(sqliteClient, {
        schema: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
        logger: ("TURBOPACK compile-time value", "development") === 'development'
    });
    console.log('✅ SQLite Drizzle instance created.');
} else {
    throw new Error(`Unsupported DB_TYPE: ${dbType}. Must be "postgres" or "sqlite".`);
}
const db = dbInstance;
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/actions/authActions.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, a: __turbopack_async_module__ } = __turbopack_context__;
__turbopack_async_module__(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
/* __next_internal_action_entry_do_not_use__ {"603dcf86c247ba3b1ad3b634f9051d9928b90df1ec":"switchPracticeAction","60b39a56c016027888fed902fc31686ec165948b14":"loginUserAction"} */ __turbopack_context__.s({
    "loginUserAction": (()=>loginUserAction),
    "switchPracticeAction": (()=>switchPracticeAction)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$app$2d$render$2f$encryption$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/app-render/encryption.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/index.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schemas/usersSchema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
([__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__);
;
;
;
;
;
;
async function /*#__TURBOPACK_DISABLE_EXPORT_MERGING__*/ loginUserAction(emailInput, passwordInput) {
    const result = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"].email, emailInput)).limit(1);
    const dbUser = result[0];
    if (!dbUser || !dbUser.password) {
        throw new Error('User not found or password not set.');
    }
    const passwordMatch = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].compareSync(passwordInput, dbUser.password);
    if (!passwordMatch) {
        throw new Error('Invalid credentials. Please try again.');
    }
    let userData;
    if (dbUser.role === 'ADMINISTRATOR') {
        const adminPractices = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].select({
            practiceId: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePractices"].practiceId
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePractices"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePractices"].administratorId, dbUser.id));
        const accessiblePracticeIds = adminPractices.map((p)=>p.practiceId);
        let currentPracticeId = dbUser.currentPracticeId;
        if (!currentPracticeId && accessiblePracticeIds.length > 0) {
            currentPracticeId = accessiblePracticeIds[0];
        } else if (!currentPracticeId && accessiblePracticeIds.length === 0) {
            console.warn(`Administrator ${dbUser.email} has no current or accessible practices configured.`);
            currentPracticeId = 'practice_NONE'; // Fallback
        }
        userData = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || undefined,
            role: 'ADMINISTRATOR',
            accessiblePracticeIds,
            currentPracticeId: currentPracticeId
        };
    } else if (dbUser.role === 'PRACTICE_ADMINISTRATOR') {
        if (!dbUser.practiceId) {
            throw new Error('Practice Administrator is not associated with a practice.');
        }
        userData = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || undefined,
            role: 'PRACTICE_ADMINISTRATOR',
            practiceId: dbUser.practiceId
        };
    } else if (dbUser.role === 'CLIENT') {
        if (!dbUser.practiceId) {
            throw new Error('Client is not associated with a practice.');
        }
        userData = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || undefined,
            role: 'CLIENT',
            practiceId: dbUser.practiceId
        };
    } else {
        throw new Error('Unknown user role.');
    }
    return userData;
}
async function /*#__TURBOPACK_DISABLE_EXPORT_MERGING__*/ switchPracticeAction(userId, newPracticeId) {
    try {
        // First, verify the user exists and is an administrator
        const userResult = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].select({
            role: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"].role
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"].id, userId)).limit(1);
        if (!userResult[0] || userResult[0].role !== 'ADMINISTRATOR') {
            throw new Error("User not found or not an administrator.");
        }
        // We should also verify if newPracticeId is one of the admin's accessiblePracticeIds
        // For now, proceeding with update. A full implementation would fetch accessible IDs again here or ensure client provides valid one.
        const adminUserPractices = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].select({
            practiceId: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePractices"].practiceId
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePractices"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePractices"].administratorId, userId));
        if (!adminUserPractices.map((p)=>p.practiceId).includes(newPracticeId)) {
            throw new Error("Administrator does not have access to this practice.");
        }
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"]).set({
            currentPracticeId: newPracticeId
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"].id, userId));
        const updatedDbUser = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["users"].id, userId)).limit(1);
        if (!updatedDbUser[0]) {
            throw new Error("Failed to refetch user after update.");
        }
        const adminPractices = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].select({
            practiceId: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePractices"].practiceId
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePractices"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schemas$2f$usersSchema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["administratorAccessiblePractices"].administratorId, updatedDbUser[0].id));
        const accessiblePracticeIds = adminPractices.map((p)=>p.practiceId);
        const refreshedUser = {
            id: updatedDbUser[0].id,
            email: updatedDbUser[0].email,
            name: updatedDbUser[0].name || undefined,
            role: 'ADMINISTRATOR',
            accessiblePracticeIds: accessiblePracticeIds,
            currentPracticeId: newPracticeId
        };
        return {
            success: true,
            updatedUser: refreshedUser
        };
    } catch (error) {
        console.error("Failed to switch practice:", error);
        if (error instanceof Error) {
            return {
                success: false,
                updatedUser: undefined
            }; // Consider returning error message
        }
        return {
            success: false
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    loginUserAction,
    switchPracticeAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(loginUserAction, "60b39a56c016027888fed902fc31686ec165948b14", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(switchPracticeAction, "603dcf86c247ba3b1ad3b634f9051d9928b90df1ec", null);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/.next-internal/server/app/_not-found/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/authActions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({});
;
;
}}),
"[project]/.next-internal/server/app/_not-found/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/authActions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, a: __turbopack_async_module__ } = __turbopack_context__;
__turbopack_async_module__(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/authActions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$_not$2d$found$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/_not-found/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/authActions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
([__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/.next-internal/server/app/_not-found/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/authActions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <exports>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, a: __turbopack_async_module__ } = __turbopack_context__;
__turbopack_async_module__(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s({
    "603dcf86c247ba3b1ad3b634f9051d9928b90df1ec": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["switchPracticeAction"]),
    "60b39a56c016027888fed902fc31686ec165948b14": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loginUserAction"])
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/authActions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$_not$2d$found$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/_not-found/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/authActions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
([__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/.next-internal/server/app/_not-found/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/authActions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, a: __turbopack_async_module__ } = __turbopack_context__;
__turbopack_async_module__(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s({
    "603dcf86c247ba3b1ad3b634f9051d9928b90df1ec": (()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$_not$2d$found$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__["603dcf86c247ba3b1ad3b634f9051d9928b90df1ec"]),
    "60b39a56c016027888fed902fc31686ec165948b14": (()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$_not$2d$found$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__["60b39a56c016027888fed902fc31686ec165948b14"])
});
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$_not$2d$found$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/_not-found/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/authActions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <module evaluation>');
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$_not$2d$found$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/_not-found/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/authActions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <exports>');
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$_not$2d$found$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$module__evaluation$3e$__,
    __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$_not$2d$found$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__
]);
([__TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$_not$2d$found$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$module__evaluation$3e$__, __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$_not$2d$found$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/app/favicon.ico.mjs { IMAGE => \"[project]/src/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript, Next.js server component)": ((__turbopack_context__) => {

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/favicon.ico.mjs { IMAGE => \"[project]/src/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript)"));
}}),
"[project]/src/app/layout.tsx [app-rsc] (ecmascript, Next.js server component)": ((__turbopack_context__) => {

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/layout.tsx [app-rsc] (ecmascript)"));
}}),

};

//# sourceMappingURL=%5Broot%20of%20the%20server%5D__e076b2b0._.js.map
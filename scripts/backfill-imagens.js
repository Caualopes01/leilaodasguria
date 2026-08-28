"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
var sharp_1 = __importDefault(require("sharp"));
var fs = __importStar(require("fs"));
var dotenv = __importStar(require("dotenv"));
// Carrega o .env.local caso rode manualmente
dotenv.config({ path: '.env.local' });
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
function delay(ms) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, ms); })];
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var args, isDryRun, limitArg, limit, query, _a, produtos, error, logData, chunkSize, i, chunk, _i, chunk_1, produto, imagensAtuais, novasImagens, arquivosParaDeletar, prodBytesSaved, prodImagesProcessed, hasError, prodLog, j, imgUrl, res, arrayBuffer, buffer, oldSize, compressedBuffer, newSize, savedBytes, oldPath, baseName, pathPrefix, newPath, uploadError, newUrl, dbError, delError, err_1, timestamp, logFileName;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    args = process.argv.slice(2);
                    isDryRun = args.includes('--dry-run');
                    limitArg = args.find(function (a) { return a.startsWith('--limit='); });
                    limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
                    console.log('=============================================');
                    console.log('🔄 Iniciando Backfill de Imagens (Ativos)');
                    console.log("Dry Run: ".concat(isDryRun ? 'SIM' : 'NÃO'));
                    console.log("Limit: ".concat(limit || 'Ilimitado'));
                    console.log('=============================================\n');
                    query = supabase.from('produtos').select('id, titulo, imagens, tenant_id').eq('status', 'ativo');
                    if (limit) {
                        query = query.limit(limit);
                    }
                    return [4 /*yield*/, query];
                case 1:
                    _a = _c.sent(), produtos = _a.data, error = _a.error;
                    if (error || !produtos) {
                        console.error('Erro ao buscar produtos ativos:', error);
                        return [2 /*return*/];
                    }
                    console.log("Encontrados ".concat(produtos.length, " produtos ativos.\n"));
                    logData = {
                        timestamp: new Date().toISOString(),
                        isDryRun: isDryRun,
                        totalProdutos: produtos.length,
                        produtosProcessados: 0,
                        imagensProcessadas: 0,
                        bytesEconomizados: 0,
                        erros: [],
                        produtos: []
                    };
                    chunkSize = 5;
                    i = 0;
                    _c.label = 2;
                case 2:
                    if (!(i < produtos.length)) return [3 /*break*/, 22];
                    chunk = produtos.slice(i, i + chunkSize);
                    _i = 0, chunk_1 = chunk;
                    _c.label = 3;
                case 3:
                    if (!(_i < chunk_1.length)) return [3 /*break*/, 19];
                    produto = chunk_1[_i];
                    console.log("[".concat(produto.id, "] Processando: ").concat(produto.titulo));
                    imagensAtuais = produto.imagens || [];
                    novasImagens = __spreadArray([], imagensAtuais, true);
                    arquivosParaDeletar = [];
                    prodBytesSaved = 0;
                    prodImagesProcessed = 0;
                    hasError = false;
                    prodLog = {
                        id: produto.id,
                        titulo: produto.titulo,
                        mudancas: []
                    };
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 16, , 17]);
                    j = 0;
                    _c.label = 5;
                case 5:
                    if (!(j < imagensAtuais.length)) return [3 /*break*/, 12];
                    imgUrl = imagensAtuais[j];
                    // Idempotência
                    if (imgUrl.includes('-opt.webp') || imgUrl.includes('/arquivo/')) {
                        console.log("  \u2514 Imagem ".concat(j + 1, "/").concat(imagensAtuais.length, " j\u00E1 otimizada. Pulando."));
                        return [3 /*break*/, 11];
                    }
                    console.log("  \u2514 Baixando imagem ".concat(j + 1, "/").concat(imagensAtuais.length, "..."));
                    return [4 /*yield*/, fetch(imgUrl)];
                case 6:
                    res = _c.sent();
                    if (!res.ok)
                        throw new Error("Falha ao baixar imagem: ".concat(res.statusText));
                    return [4 /*yield*/, res.arrayBuffer()];
                case 7:
                    arrayBuffer = _c.sent();
                    buffer = Buffer.from(arrayBuffer);
                    oldSize = buffer.length;
                    console.log("  \u2514 Comprimindo...");
                    return [4 /*yield*/, (0, sharp_1.default)(buffer)
                            .resize({ width: 1600, withoutEnlargement: true })
                            .webp({ quality: 80 })
                            .toBuffer()];
                case 8:
                    compressedBuffer = _c.sent();
                    newSize = compressedBuffer.length;
                    savedBytes = oldSize - newSize;
                    prodBytesSaved += savedBytes;
                    prodImagesProcessed++;
                    console.log("  \u2514 Redu\u00E7\u00E3o: ".concat((oldSize / 1024).toFixed(0), "KB -> ").concat((newSize / 1024).toFixed(0), "KB (Economia: ").concat((savedBytes / 1024).toFixed(0), "KB)"));
                    oldPath = imgUrl.split('/storage/v1/object/public/produtos/')[1];
                    if (!oldPath)
                        throw new Error('Caminho de bucket inválido.');
                    baseName = ((_b = oldPath.split('/').pop()) === null || _b === void 0 ? void 0 : _b.split('.')[0]) || "img-".concat(Date.now());
                    pathPrefix = oldPath.substring(0, oldPath.lastIndexOf('/'));
                    newPath = pathPrefix ? "".concat(pathPrefix, "/").concat(baseName, "-opt.webp") : "".concat(baseName, "-opt.webp");
                    if (!!isDryRun) return [3 /*break*/, 10];
                    console.log("  \u2514 Fazendo upload: ".concat(newPath));
                    return [4 /*yield*/, supabase.storage.from('produtos')
                            .upload(newPath, compressedBuffer, { contentType: 'image/webp', upsert: false })];
                case 9:
                    uploadError = (_c.sent()).error;
                    if (uploadError)
                        throw uploadError;
                    newUrl = supabase.storage.from('produtos').getPublicUrl(newPath).data.publicUrl;
                    novasImagens[j] = newUrl;
                    arquivosParaDeletar.push(oldPath);
                    _c.label = 10;
                case 10:
                    prodLog.mudancas.push({
                        oldUrl: imgUrl,
                        newUrl: isDryRun ? '(dry run simulada)' : novasImagens[j],
                        oldSizeKB: Math.round(oldSize / 1024),
                        newSizeKB: Math.round(newSize / 1024)
                    });
                    _c.label = 11;
                case 11:
                    j++;
                    return [3 /*break*/, 5];
                case 12:
                    if (!(!isDryRun && arquivosParaDeletar.length > 0)) return [3 /*break*/, 15];
                    console.log("  \u2514 Atualizando banco de dados...");
                    return [4 /*yield*/, supabase.from('produtos')
                            .update({ imagens: novasImagens })
                            .eq('id', produto.id)];
                case 13:
                    dbError = (_c.sent()).error;
                    if (dbError)
                        throw dbError;
                    console.log("  \u2514 Deletando originais pesados...");
                    return [4 /*yield*/, supabase.storage.from('produtos').remove(arquivosParaDeletar)];
                case 14:
                    delError = (_c.sent()).error;
                    if (delError)
                        console.error("    [!] Erro ao deletar originais:", delError);
                    _c.label = 15;
                case 15: return [3 /*break*/, 17];
                case 16:
                    err_1 = _c.sent();
                    console.error("  [ERRO] Falha no produto ".concat(produto.id, ":"), err_1.message);
                    hasError = true;
                    logData.erros.push({ produtoId: produto.id, mensagem: err_1.message });
                    return [3 /*break*/, 17];
                case 17:
                    if (prodImagesProcessed > 0 || hasError) {
                        prodLog.hasError = hasError;
                        logData.produtos.push(prodLog);
                    }
                    logData.produtosProcessados++;
                    logData.imagensProcessadas += prodImagesProcessed;
                    logData.bytesEconomizados += prodBytesSaved;
                    console.log("[".concat(produto.id, "] Conclu\u00EDdo.\n"));
                    _c.label = 18;
                case 18:
                    _i++;
                    return [3 /*break*/, 3];
                case 19:
                    if (!(i + chunkSize < produtos.length)) return [3 /*break*/, 21];
                    console.log("Aguardando 1s para o pr\u00F3ximo lote (anti rate-limit)...\n");
                    return [4 /*yield*/, delay(1000)];
                case 20:
                    _c.sent();
                    _c.label = 21;
                case 21:
                    i += chunkSize;
                    return [3 /*break*/, 2];
                case 22:
                    timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    logFileName = "backfill-log-".concat(timestamp, ".json");
                    fs.writeFileSync(logFileName, JSON.stringify(logData, null, 2));
                    console.log('=============================================');
                    console.log('✅ Backfill Concluído');
                    console.log("Modo: ".concat(isDryRun ? 'DRY RUN' : 'REAL'));
                    console.log("Produtos analisados: ".concat(produtos.length));
                    console.log("Imagens comprimidas: ".concat(logData.imagensProcessadas));
                    console.log("Espa\u00E7o economizado: ".concat((logData.bytesEconomizados / 1024 / 1024).toFixed(2), " MB"));
                    console.log("Log salvo em: ".concat(logFileName));
                    console.log('=============================================');
                    return [2 /*return*/];
            }
        });
    });
}
run().catch(console.error);

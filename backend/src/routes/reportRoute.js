import express from "express";
import * as ctrl from "../controllers/reportController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { uploadCsv, uploadJson } from "../middlewares/uploadMiddleware.js";

const router = express.Router();
router.use(protectedRoute);

router.get("/overview", ctrl.overview);
router.get("/range", ctrl.rangeReport);
router.get("/daily-stats", ctrl.dailyStats);
router.get("/weekly-stats", ctrl.weeklyStats);
router.get("/compare-months", ctrl.compareMonths);
router.get("/forecast", ctrl.forecast);
router.get("/preset-ranges", ctrl.presetRanges);

router.get("/export/excel", ctrl.exportExcel);
router.get("/export/csv", ctrl.exportCsv);
router.get("/export/pdf", ctrl.exportPdf);
router.get("/export/backup-json", ctrl.exportBackupJson);
router.post("/import/transactions-csv", uploadCsv.single("csv"), ctrl.importTransactionsCsv);
router.post("/import/backup-json", uploadJson.single("backup"), ctrl.restoreBackupJson);

export default router;

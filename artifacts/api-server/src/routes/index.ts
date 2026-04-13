import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import authRouter from "./auth";
import healthRouter from "./health";
import storageRouter from "./storage";
import accountsRouter from "./accounts";
import categoriesRouter from "./categories";
import transactionsRouter from "./transactions";
import creditCardsRouter from "./credit-cards";
import monthlyPlansRouter from "./monthly-plans";
import annualPlansRouter from "./annual-plans";
import recurringRouter from "./recurring";
import custoDeVidaRouter from "./custo-de-vida";
import assetsRouter from "./assets";
import budgetRouter from "./budget";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import performanceRouter from "./performance";
import agendaRouter from "./agenda";
import viagensRouter from "./viagens";
import eventsRouter from "./events";
import crescimentoRouter from "./crescimento";
import conhecimentoRouter from "./conhecimento";
import sugestoesRouter from "./sugestoes";
import globalDashboardRouter from "./global-dashboard";
import { idiomasRouter } from "./idiomas";
import vidaRouter from "./vida";
import corpoAnaliseRouter from "./corpo-analise";
import treinoSistemaRouter from "./treino-sistema";
import stripeRouter from "./stripe";
import importsRouter from "./imports";
import filterViewsRouter from "./filter-views";
import conciliationRouter from "./conciliation";
import centroComandoRouter from "./centro-comando";

const router: IRouter = Router();

// Public routes (no auth required)
router.use(healthRouter);
router.use(authRouter);

// All routes below require authentication
router.use(requireAuth);

router.use(storageRouter);
router.use(accountsRouter);
router.use(categoriesRouter);
router.use(transactionsRouter);
router.use(creditCardsRouter);
router.use(monthlyPlansRouter);
router.use(annualPlansRouter);
router.use(recurringRouter);
router.use(custoDeVidaRouter);
router.use(assetsRouter);
router.use(budgetRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(performanceRouter);
router.use(agendaRouter);
router.use(viagensRouter);
router.use(eventsRouter);
router.use(crescimentoRouter);
router.use(conhecimentoRouter);
router.use(sugestoesRouter);
router.use(globalDashboardRouter);
router.use("/idiomas", idiomasRouter);
router.use(vidaRouter);
router.use(corpoAnaliseRouter);
router.use(treinoSistemaRouter);
router.use(stripeRouter);
router.use(importsRouter);
router.use("/filter-views", filterViewsRouter);
router.use("/conciliation", conciliationRouter);
router.use(centroComandoRouter);

export default router;

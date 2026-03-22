import { Router, type IRouter } from "express";
import healthRouter from "./health";
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

const router: IRouter = Router();

router.use(healthRouter);
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

export default router;

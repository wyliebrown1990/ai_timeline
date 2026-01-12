-- CreateTable: NewsQuiz
-- Weekly news quiz (Sprint LEarn-2)
CREATE TABLE "NewsQuiz" (
    "id" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsQuiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NewsQuizAttempt
-- User attempts at weekly news quizzes (Sprint LEarn-2)
CREATE TABLE "NewsQuizAttempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsQuiz_weekOf_key" ON "NewsQuiz"("weekOf");

-- CreateIndex
CREATE INDEX "NewsQuiz_weekOf_idx" ON "NewsQuiz"("weekOf");

-- CreateIndex
CREATE INDEX "NewsQuizAttempt_sessionId_idx" ON "NewsQuizAttempt"("sessionId");

-- CreateIndex
CREATE INDEX "NewsQuizAttempt_quizId_idx" ON "NewsQuizAttempt"("quizId");

-- AddForeignKey
ALTER TABLE "NewsQuizAttempt" ADD CONSTRAINT "NewsQuizAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsQuizAttempt" ADD CONSTRAINT "NewsQuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "NewsQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

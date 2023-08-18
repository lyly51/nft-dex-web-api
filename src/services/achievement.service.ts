import { Service } from "typedi";
import prisma from "../helpers/client";
import { Achievement, Prisma, RepeatPeriod, User } from "@prisma/client";

type AchievementProgress = {
  title: string;
  type?: string;
  action?: string;
  page?: string;
  step: number;
  progress: number;
  repeatPeriod: string;
  code: string;
  points: number;
  displayStep: string;
  endTime: Date;
};

@Service()
export class AchievementService {

  async getUserAchievementList(userAddress: string) {
    return prisma.$queryRaw<AchievementProgress[]>`
    SELECT a."title", a."step", a."repeatPeriod", a."type", a."action", a."page", a."code", a."points", a."displayStep", a."endTime",
    CASE WHEN (CASE WHEN r."progress" IS NULL THEN 1 ELSE 0 END) = 0
    THEN (r."progress")
    ELSE 0
    END
    AS "progress"
    FROM api."Achievement" a 
    LEFT JOIN 
    (SELECT ua."achievementId", MAX(ua."progress") AS "progress"
    FROM
    api."UserAchievement" ua
    WHERE 
    ua."userAddress" = ${userAddress.toLowerCase()}
    AND
    ua."ended" = false
    GROUP BY ua."achievementId") r
    ON a."id" = r."achievementId"
    WHERE a."referralRelated" = false
    AND a."code" != 'A02'`;
  }

  async getUserAchievementHistory(userAddress: string, limit: number, offset: number) {
    return prisma.userAchievement.findMany({
      take: limit,
      skip: offset,
      select: {
        pointEarned: true,
        createTime: true,
        achievement: {
          select: {
            code: true,
            description: true
          }
        },
        referralUser: {
          select: {
            userInfo: {
              select: {
                username: true,
                userAddress: true
              }
            }
          }
        }
      },
      where: {
        userAddress: userAddress.toLowerCase(),
        completed: true
      },
      orderBy: {
        createTime: "desc"
      }
    });
  }

  async findAchievementByCode(achievementCode: string) {
    return prisma.achievement.findFirst({
      where: {
        code: achievementCode,
        enabled: true
      }
    });
  }

  async findAchievementByCodeAndTxHash(achievementCode: string, txHash: string) {
    return prisma.userAchievement.findFirst({
      where: {
        achievement: {
          code: achievementCode,
          enabled: true
        },
        txHash
      }
    });
  }

  async findUserAchievementByCodeAndReferredUser(achievementCode: string, userAddress: string) {
    return prisma.userAchievement.findFirst({
      where: {
        referralUserAddress: userAddress.toLocaleLowerCase(),
        achievement: {
          code: achievementCode
        }
      }
    });
  }

  async findCompletedAchievementById(achievementId: string) {
    return prisma.userAchievement.findMany({
      where: {
        achievementId,
        completed: true
      }
    });
  }

  async findUserCompletedAchievementById(userAddress: string, achievementId: string) {
    return prisma.userAchievement.findMany({
      where: {
        userAddress: {
          equals: userAddress.toLocaleLowerCase()
        },
        achievementId,
        completed: true
      }
    });
  }

  async findUserAchievementByTxHash(achievementId: string, txHash: string) {
    return prisma.userAchievement.findMany({
      where: {
        achievementId,
        txHash
      }
    });
  }

  async findCompletedAchievementByIdAfter(achievementId: string, date: Date) {
    return prisma.userAchievement.findMany({
      where: {
        achievementId,
        completed: true,
        createTime: {
          gte: date
        }
      }
    });
  }

  async findUserCompletedAchievementByIdAfter(userAddress: string, achievementId: string, date: Date) {
    return prisma.userAchievement.findMany({
      where: {
        userAddress: {
          equals: userAddress.toLowerCase()
        },
        achievementId,
        completed: true,
        createTime: {
          gte: date
        }
      }
    });
  }

  async getReferralAchievements(userAddress: string, limit: number) {
    return prisma.userAchievement.findMany({
      take: limit,
      where: {
        userAddress: userAddress.toLowerCase(),
        hidden: false,
        achievement: {
          referralRelated: true
        }
      },
      select: {
        pointEarned: true,
        createTime: true,
        achievement: {
          select: {
            title: true
          }
        },
        referralUser: {
          select: {
            userInfo: {
              select: {
                username: true,
                userAddress: true
              }
            }
          }
        }
      },
      orderBy: {
        createTime: "desc"
      }
    });
  }

  async hideReferralAchievements(achievementCode: string, userAddress: string, referralUserAddress: string) {
    return prisma.userAchievement.updateMany({
      data: { hidden: true },
      where: {
        userAddress: userAddress.toLowerCase(),
        referralUserAddress: referralUserAddress.toLowerCase(),
        achievement: {
          code: achievementCode
        }
      }
    });
  }

  private async completeAchievementInternal(
    walletAddress: string,
    achievement: Achievement,
    referralUserAddress?: string,
    txHash?: string,
    extraData?: string[],
    forcePointEarned?: number
  ) {
    const now = new Date();
    const nowTimestamp = Math.floor(now.getTime() / 1000);
    try {
      let result = await prisma.$transaction(async tx => {
        const totalSteps = achievement.step;
        let startDate = this.getAchievementStartDate(achievement.repeatPeriod);
        let lastAchievement = await (startDate
          ? tx.userAchievement.findFirst({
              where: {
                userAddress: walletAddress.toLowerCase(),
                achievementId: achievement.id,
                createTime: {
                  gte: startDate
                },
                ended: false,
                completed: false
              },
              orderBy: {
                createTime: "desc"
              }
            })
          : tx.userAchievement.findFirst({
              where: {
                userAddress: walletAddress.toLowerCase(),
                achievementId: achievement.id,
                ended: false,
                completed: false
              },
              orderBy: {
                createTime: "desc"
              }
            }));

        let combinedDataWithoutDuplicate = null;

        let dataArray;

        const pointEarned = forcePointEarned ?? achievement.points;

        if (extraData) {
          dataArray = lastAchievement?.data ? (lastAchievement.data as string[]) : [];
          combinedDataWithoutDuplicate = new Set([...dataArray, ...extraData]);
          if (combinedDataWithoutDuplicate.length <= dataArray.length) {
            // No new item
            throw new Error(`No new item`);
          }
          dataArray = dataArray.concat(extraData);
        }

        if ((lastAchievement && lastAchievement.progress + 1 === totalSteps) || totalSteps === 1) {
          // Achievement completed, give points to user
          const updatedUserInfos = await tx.userInfo.updateMany({
            data: {
              points: {
                increment: achievement.referralRelated ? 0 : pointEarned
              },
              referralPoints: {
                increment: achievement.referralRelated ? pointEarned : 0
              },
              updateTime: now,
              updateTimestamp: nowTimestamp
            },
            where: {
              userAddress: walletAddress.toLowerCase()
            }
          });
          if (updatedUserInfos.count === 0) {
            throw new Error(`Please try again.`);
          }

          const updatedAchievements = await tx.achievement.updateMany({
            data: {
              latestCompletedTime: now,
              updateTime: now
            },
            where: {
              id: achievement.id,
              latestCompletedTime: achievement.latestCompletedTime
            }
          });

          if (updatedAchievements.count === 0) {
            throw new Error(`Please try again.`);
          }
        }

        const completedAchievement = tx.userAchievement.create({
          data: {
            userAddress: walletAddress.toLowerCase(),
            achievementId: achievement.id,
            pointEarned: (lastAchievement?.progress ?? 0) + 1 === totalSteps ? pointEarned : 0,
            createTime: now,
            updateTime: now,
            referralUserAddress: referralUserAddress ? referralUserAddress.toLowerCase() : null,
            progress: lastAchievement ? lastAchievement.progress + 1 : 1,
            completed: (lastAchievement?.progress ?? 0) + 1 === totalSteps ? true : false,
            txHash,
            data: dataArray?.length > 0 ? dataArray : undefined
          }
        });

        return completedAchievement;
      });
    } catch (e) {
      console.log(e);
    }
  }

  async isEligibleForAchievement(walletAddress: string, achievement: Achievement) {
    const repeatPeriod = achievement.repeatPeriod;
    const repeatCount = achievement.redeemLimit;

    if (repeatCount === 0) return true; // No limit

    let startDate = this.getAchievementStartDate(repeatPeriod);

    // if (txHash) {
    //   let completedAchievementWithTxHash = await this.findCompletedAchievementByTxHash(achievement.id, txHash);
    //   if (completedAchievementWithTxHash.length > 0) return false;
    // }

    let completedAchievements = [];

    if (achievement.isGlobal) {
      completedAchievements = await (startDate
        ? this.findCompletedAchievementByIdAfter(achievement.id, startDate)
        : this.findCompletedAchievementById(achievement.id));
    } else {
      completedAchievements = await (startDate
        ? this.findUserCompletedAchievementByIdAfter(walletAddress, achievement.id, startDate)
        : this.findUserCompletedAchievementById(walletAddress, achievement.id));
    }

    return completedAchievements.length < repeatCount;
  }

  async completeAchievement(
    walletAddress: string,
    achievementCode: string,
    referralUserAddress?: string,
    txHash?: string,
    extraData?: string[],
    completeWhenNotEligible = false
  ) {
    const achievement = await this.findAchievementByCode(achievementCode);

    if (!achievement) {
      return false;
    }

    if (txHash) {
      let completedAchievementWithTxHash = await this.findUserAchievementByTxHash(achievement.id, txHash);
      if (completedAchievementWithTxHash.length > 0) {
        return false;
      }
    }

    const isEligible = await this.isEligibleForAchievement(walletAddress, achievement);

    if (!isEligible && !completeWhenNotEligible) {
      return false;
    }

    await this.completeAchievementInternal(
      walletAddress,
      achievement,
      referralUserAddress,
      txHash,
      extraData,
      !isEligible && completeWhenNotEligible ? 0 : null
    );
  }

  private getAchievementStartDate(repeatPeriod: RepeatPeriod): Date {
    let startDate: Date;

    switch (repeatPeriod) {
      case "None":
        startDate = null;
        break;
      case "Daily":
        startDate = new Date();
        startDate.setUTCHours(0, 0, 0, 0);
        break;
      case "Weekly":
        startDate = new Date();
        let day = startDate.getUTCDay();
        let diff = startDate.getUTCDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
        startDate.setUTCDate(diff);
        startDate.setUTCHours(0, 0, 0, 0);
        break;
      case "Monthly":
        startDate = new Date();
        startDate.setUTCDate(1);
        startDate.setUTCHours(0, 0, 0, 0);
        break;
      case "Yearly":
        startDate = new Date();
        startDate.setUTCMonth(0);
        startDate.setUTCDate(1);
        startDate.setUTCHours(0, 0, 0, 0);
        break;
      default:
        break;
    }

    return startDate;
  }
}

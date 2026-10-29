"use server";

import db from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

function serializeTransaction(obj) {
	const serialized = { ...obj };

	if(obj.balance) {
		serialized.balance = obj.balance.toNumber();
	}
	if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
	return serialized;
}

export async function createAccount(data) {
	try {
		const {userId} = await auth();
		if(!userId) throw new Error("Unauthorized");

		const user = await db.user.findUnique({
			where: { clerkUserId: userId },
		});

		const balance = parseFloat(data.balance);
		if(isNaN(balance)) {
			throw new Error("Invalid balance amount");
		}

		const existingAccounts = await db.account.findMany({
			where: { userId: user.id },
		});

		const isDefault = existingAccounts.length == 0 ? true : data.isDefault;

		if(isDefault) {
			await db.account.updateMany({
				where: { userId: user.id, isDefault: true },
				data: { isDefault: false },
			});
		}

		const account = await db.account.create({
			data: {
				...data,
				balance: balance,
				userId: user.id,
				isDefault: isDefault
			}
		});

		const serializedAccount = serializeTransaction(account);

		revalidatePath("/dashboard");
		return { success: true, data: serializedAccount };

	} catch (error) {
		throw new Error(error.message);
	}
}

export async function getUserAccounts() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");

	const user = await db.user.findUnique({
		where: { clerkUserId: userId },
	});

	if (!user) {
		throw new Error("User not found");
	}

	try {
		const accounts = await db.account.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: "desc" },
			include: {
				_count: {
					select: {
						transactions: true,
					},
				},
			},
		});

		// Serialize accounts before sending to client
		const serializedAccounts = accounts.map(serializeTransaction);

		return serializedAccounts;
	} catch (error) {
		console.error(error.message);
	}
}
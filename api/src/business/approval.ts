import { BusinessError, BusinessErrorCode } from "./errors.js";
import {
  HIGH_VALUE_EXPENSE_CENTS,
  UserRole,
  type User,
} from "./models.js";

export function selectApprover(
  requester: User,
  amountCents: number,
  users: User[],
): User {
  // Low-value requests prefer the requester's manager. A missing or
  // self-referencing manager deliberately falls through to finance.
  if (amountCents < HIGH_VALUE_EXPENSE_CENTS) {
    const manager = users.find(({ id }) => id === requester.managerId);

    if (manager !== undefined && manager.id !== requester.id) {
      return manager;
    }
  }

  const financeApprover = users.find(({ role }) => role === UserRole.Finance);

  if (financeApprover === undefined) {
    throw new BusinessError(
      BusinessErrorCode.ApproverUnavailable,
      "No finance approver is available",
    );
  }

  if (financeApprover.id === requester.id) {
    throw new BusinessError(
      BusinessErrorCode.ApproverUnavailable,
      "The requester cannot approve their own expense, and no alternative finance approver is available",
    );
  }

  return financeApprover;
}

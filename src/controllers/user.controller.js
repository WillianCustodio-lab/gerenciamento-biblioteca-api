import {
  findAllUsers,
  findUserById,
} from "../services/user.service.js";

export async function showCurrentUser(request, response, next) {
  try {
    const user = await findUserById(request.user.id);

    if (!user) {
      return response.status(404).json({
        message: "Usuário não encontrado.",
      });
    }

    return response.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

export async function listUsers(request, response, next) {
  try {
    const users = await findAllUsers();
    return response.status(200).json({ users });
  } catch (error) {
    return next(error);
  }
}

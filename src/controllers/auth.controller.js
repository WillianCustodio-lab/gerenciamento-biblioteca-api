import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "../services/auth.service.js";

export async function register(request, response, next) {
  try {
    const user = await registerUser(request.body);

    return response.status(201).json({
      message: "Usuário cadastrado com sucesso.",
      user,
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(request, response, next) {
  try {
    const result = await loginUser(request.body);

    return response.status(200).json({
      message: "Login realizado com sucesso.",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function forgotPassword(request, response, next) {
  try {
    await requestPasswordReset(request.body);

    return response.status(200).json({
      message: "Se o e-mail estiver cadastrado, as instruções serão enviadas.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function changePassword(request, response, next) {
  try {
    await resetPassword(request.body);

    return response.status(200).json({
      message: "Senha alterada com sucesso.",
    });
  } catch (error) {
    return next(error);
  }
}

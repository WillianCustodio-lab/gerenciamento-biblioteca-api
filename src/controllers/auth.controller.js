import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "../services/auth.service.js";

export async function register(request, response) {
  try {
    const user = await registerUser(request.body);

    return response.status(201).json({
      message: "Usuário cadastrado com sucesso.",
      user,
    });
  } catch (error) {
    return response.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Erro interno ao cadastrar usuário.",
    });
  }
}

export async function login(request, response) {
  try {
    const result = await loginUser(request.body);

    return response.status(200).json({
      message: "Login realizado com sucesso.",
      ...result,
    });
  } catch (error) {
    return response.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Erro interno ao realizar login.",
    });
  }
}

export async function forgotPassword(request, response) {
  try {
    await requestPasswordReset(request.body);

    return response.status(200).json({
      message: "Se o e-mail estiver cadastrado, as instruções serão enviadas.",
    });
  } catch (error) {
    return response.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Não foi possível enviar o e-mail de recuperação.",
    });
  }
}

export async function changePassword(request, response) {
  try {
    await resetPassword(request.body);

    return response.status(200).json({
      message: "Senha alterada com sucesso.",
    });
  } catch (error) {
    return response.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Erro interno ao alterar a senha.",
    });
  }
}

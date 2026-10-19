export function authorize(...allowedRoles) {
  return (request, response, next) => {
    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({
        message: "Você não possui permissão para esta operação.",
      });
    }

    return next();
  };
}

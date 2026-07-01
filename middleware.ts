import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Acceso restringido. Ingrese usuario y contraseña.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Rutas Himetal", charset="UTF-8"'
    }
  });
}

export function middleware(request: NextRequest) {
  const validUser = process.env.APP_USERNAME;
  const validPassword = process.env.APP_PASSWORD;

  if (!validUser || !validPassword) {
    return new NextResponse(
      "Faltan configurar APP_USERNAME y APP_PASSWORD en las variables de entorno.",
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const base64Credentials = authHeader.split(" ")[1] ?? "";
    const decodedCredentials = atob(base64Credentials);
    const separatorIndex = decodedCredentials.indexOf(":");

    if (separatorIndex === -1) {
      return unauthorized();
    }

    const username = decodedCredentials.slice(0, separatorIndex);
    const password = decodedCredentials.slice(separatorIndex + 1);

    if (username === validUser && password === validPassword) {
      return NextResponse.next();
    }
  } catch {
    return unauthorized();
  }

  return unauthorized();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

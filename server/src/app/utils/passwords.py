import hashlib
import hmac
import secrets

_SCRYPT_COST = 2**14
_SCRYPT_BLOCK_SIZE = 8
_SCRYPT_PARALLELISM = 1


def hash_password(password: str) -> tuple[str, str]:
    salt = secrets.token_bytes(32)
    password_hash = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_SCRYPT_COST,
        r=_SCRYPT_BLOCK_SIZE,
        p=_SCRYPT_PARALLELISM,
    )
    return salt.hex(), password_hash.hex()


def verify_password(password: str, salt_hex: str, expected_hash_hex: str) -> bool:
    try:
        actual_hash = hashlib.scrypt(
            password.encode("utf-8"),
            salt=bytes.fromhex(salt_hex),
            n=_SCRYPT_COST,
            r=_SCRYPT_BLOCK_SIZE,
            p=_SCRYPT_PARALLELISM,
        )
        expected_hash = bytes.fromhex(expected_hash_hex)
    except ValueError:
        return False

    return hmac.compare_digest(actual_hash, expected_hash)

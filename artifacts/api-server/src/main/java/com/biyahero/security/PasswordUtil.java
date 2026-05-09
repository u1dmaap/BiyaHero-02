package com.biyahero.security;

import org.springframework.stereotype.Component;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;

@Component
public class PasswordUtil {

    private static final int ITERATIONS = 100_000;
    private static final int KEY_LENGTH = 64 * 8;
    private static final String ALGORITHM = "PBKDF2WithHmacSHA512";

    public String hashPassword(String password) {
        SecureRandom rng = new SecureRandom();
        byte[] saltBytes = new byte[32];
        rng.nextBytes(saltBytes);
        String salt = bytesToHex(saltBytes);
        String hash = pbkdf2(password, salt);
        return "pbkdf2:" + salt + ":" + hash;
    }

    public boolean verifyPassword(String password, String stored) {
        if (stored == null) return false;
        String[] parts = stored.split(":", 3);
        if (parts.length != 3 || !"pbkdf2".equals(parts[0])) return false;
        String salt = parts[1];
        String expectedHash = parts[2];
        String candidateHash = pbkdf2(password, salt);
        return MessageDigest.isEqual(hexToBytes(expectedHash), hexToBytes(candidateHash));
    }

    private String pbkdf2(String password, String salt) {
        try {
            byte[] saltBytes = salt.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), saltBytes, ITERATIONS, KEY_LENGTH);
            SecretKeyFactory skf = SecretKeyFactory.getInstance(ALGORITHM);
            byte[] hash = skf.generateSecret(spec).getEncoded();
            spec.clearPassword();
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new RuntimeException("Password hashing failed", e);
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
    }
}

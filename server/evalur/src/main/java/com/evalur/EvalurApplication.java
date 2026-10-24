package com.evalur;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import io.github.cdimascio.dotenv.Dotenv;
import io.github.cdimascio.dotenv.DotenvException;

@SpringBootApplication
@EnableJpaAuditing
public class EvalurApplication {

    public static void main(String[] args) {
        
        // Attempt to load .env from multiple potential locations to accommodate different execution contexts.
        String[] searchPaths = {
            "./",               // 1. Standard IDE execution (starts inside server/evalur/)
            "./server/evalur/"  // 2. Terminal execution from the Team-1 root directory
        };

        boolean envLoaded = false;

        for (String path : searchPaths) {
            try {
                Dotenv.configure()
                
                        .directory(path)
                        .systemProperties() 
                        .ignoreIfMissing()
                        .load();
                
                System.out.println("SUCCESS: .env loaded from relative path: " + (path.equals("./") ? "Current Directory" : path));
                envLoaded = true;
                break; 
                
            } catch (DotenvException e) {
            }
        }

        // If the loop finishes and it's still false, fail loudly.
        if (!envLoaded) {
            System.err.println("❌ CRITICAL ERROR: Could not find the .env file.");
            System.err.println("Team, ensure your .env file is created and located in the 'server/evalur/' directory.");
            System.exit(1);
        }

        SpringApplication.run(EvalurApplication.class, args);
    }
}